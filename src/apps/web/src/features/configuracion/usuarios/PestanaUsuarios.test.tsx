import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadoresM1, usuariosMock } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PestanaUsuarios } from "./PestanaUsuarios";

const servidor = crearServidor(...manejadoresM1);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function renderPestana() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <PestanaUsuarios cliente={cliente} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const problema = (status: number, title: string, extra: object = {}) =>
  HttpResponse.json(
    { title, status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

const fila = async (texto: RegExp | string) =>
  (await screen.findByText(texto)).closest("tr") as HTMLElement;

const [lucia, ana, tomas] = usuariosMock;

describe("RF-144 alta de usuario", () => {
  it("RF-144 lista los usuarios con nombre, email, rol y acceso a redes", async () => {
    renderPestana();

    const filaLucia = await fila("Lucía Fernández");
    expect(within(filaLucia).getByText("lucia@rumbo.test")).toBeInTheDocument();
    expect(within(filaLucia).getByText(/admin/i)).toBeInTheDocument();
    expect(within(filaLucia).getByText(/redes/i)).toBeInTheDocument();
    const filaAna = await fila("Ana Pérez");
    expect(within(filaAna).getByText("ana@rumbo.test")).toBeInTheDocument();
    expect(within(filaAna).getByText(/empleado/i)).toBeInTheDocument();
    expect(await fila("Tomás Roldán")).toBeInTheDocument();
  });

  it("RF-144 si falla el GET avisa en lugar de la tabla", async () => {
    servidor.use(http.get("*/api/usuarios", () => problema(500, "Error interno")));
    renderPestana();

    expect(await screen.findByText(/no pudimos cargar los usuarios/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("RF-144 el formulario de alta avisa que la persona recibe un mail para elegir su contraseña", async () => {
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));

    expect(await screen.findByText(/recibe un mail.*contraseña/i)).toBeInTheDocument();
  });

  it("RF-144 da de alta un usuario con POST /api/usuarios", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.post("*/api/usuarios", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...tomas, ...(cuerpo as object) }, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Marta Gómez");
    await usuario.type(screen.getByLabelText(/email/i), "marta@rumbo.test");
    await usuario.selectOptions(screen.getByLabelText(/rol/i), "empleado");
    await usuario.click(screen.getByLabelText(/acceso a redes/i));
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toEqual({
        nombre: "Marta Gómez",
        email: "marta@rumbo.test",
        rol: "empleado",
        acceso_redes: true,
      });
    });
  });

  it("RF-144 el acceso a redes por defecto es falso", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.post("*/api/usuarios", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...tomas, ...(cuerpo as object) }, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Pedro Díaz");
    await usuario.type(screen.getByLabelText(/email/i), "pedro@rumbo.test");
    await usuario.selectOptions(screen.getByLabelText(/rol/i), "freelance");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ rol: "freelance", acceso_redes: false });
    });
  });

  it("RF-144 ofrece los cuatro roles, con dueño enviado como 'dueno'", async () => {
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    const rol = await screen.findByLabelText(/rol/i);

    const valores = within(rol)
      .getAllByRole("option")
      .map((opcion) => (opcion as HTMLOptionElement).value);
    expect(valores).toEqual(expect.arrayContaining(["admin", "dueno", "empleado", "freelance"]));
  });

  it("RF-144 no envía el alta si faltan nombre y email, y los marca inválidos", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/usuarios", () => {
        llamadas += 1;
        return HttpResponse.json(tomas, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(nombre).toBeInvalid();
    });
    expect(screen.getByLabelText(/email/i)).toBeInvalid();
    expect(llamadas).toBe(0);
  });

  it("RF-144 rechaza un email con formato inválido sin llamar al servidor", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/usuarios", () => {
        llamadas += 1;
        return HttpResponse.json(tomas, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Marta");
    await usuario.type(screen.getByLabelText(/email/i), "no-es-un-mail");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInvalid();
    });
    expect(llamadas).toBe(0);
  });

  it("RF-144 muestra en su campo el 422 del servidor", async () => {
    servidor.use(
      http.post("*/api/usuarios", () =>
        problema(422, "Datos inválidos", {
          errores: [{ campo: "email", mensaje: "El email no es válido." }],
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Marta");
    await usuario.type(screen.getByLabelText(/email/i), "marta@rumbo.test");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("El email no es válido.")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInvalid();
  });

  it("RF-144 muestra el 403 del servidor (admin que da de alta a un dueño) en el formulario", async () => {
    servidor.use(
      http.post("*/api/usuarios", () =>
        problema(403, "Prohibido", { detail: "Solo un dueño puede dar de alta a otro dueño." }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Marta");
    await usuario.type(screen.getByLabelText(/email/i), "marta@rumbo.test");
    await usuario.selectOptions(screen.getByLabelText(/rol/i), "dueno");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/solo un dueño/i);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Marta");
  });
});

describe("RF-146 email duplicado", () => {
  it("RF-146 muestra el 409 de email duplicado como mensaje claro y deja el formulario abierto", async () => {
    servidor.use(
      http.post("*/api/usuarios", () =>
        problema(409, "Conflicto", { detail: "Ya existe un usuario con el email ana@rumbo.test." }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Otra Ana");
    await usuario.type(screen.getByLabelText(/email/i), "ana@rumbo.test");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya existe un usuario con el email/i);
    expect(screen.getByLabelText(/email/i)).toHaveValue("ana@rumbo.test");
  });

  it("RF-146 un 409 sin detalle muestra igual un mensaje de error", async () => {
    servidor.use(http.post("*/api/usuarios", () => problema(409, "Conflicto")));
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Lucía Fernández");
    await usuario.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Otra Ana");
    await usuario.type(screen.getByLabelText(/email/i), "ana@rumbo.test");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos guardar/i);
  });
});

describe("RF-145 edición de rol y accesos", () => {
  it("RF-145 edita el rol y el acceso a redes con PATCH /api/usuarios/{id}", async () => {
    let ruta = "";
    let cuerpo: JsonBodyType;
    servidor.use(
      http.patch("*/api/usuarios/:id", async ({ request }) => {
        ruta = new URL(request.url).pathname;
        cuerpo = await request.json();
        return HttpResponse.json({ ...ana, ...(cuerpo as object) });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaAna = await fila("Ana Pérez");
    await usuario.click(within(filaAna).getByRole("button", { name: /editar/i }));
    const rol = await screen.findByLabelText(/rol/i);
    expect(rol).toHaveValue("empleado");
    const redes = screen.getByLabelText(/acceso a redes/i);
    expect(redes).not.toBeChecked();
    await usuario.selectOptions(rol, "admin");
    await usuario.click(redes);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ rol: "admin", acceso_redes: true });
    });
    expect(ruta).toBe(`/api/usuarios/${ana.id}`);
  });

  it("RF-145 al editar el email no se puede modificar", async () => {
    renderPestana();
    const usuario = userEvent.setup();

    const filaAna = await fila("Ana Pérez");
    await usuario.click(within(filaAna).getByRole("button", { name: /editar/i }));

    const email = await screen.findByLabelText(/email/i);
    expect(email).toHaveValue("ana@rumbo.test");
    expect(email).toBeDisabled();
  });

  it("RF-145 muestra el 403 de la restricción del dueño al editar el rol", async () => {
    servidor.use(
      http.patch("*/api/usuarios/:id", () =>
        problema(403, "Prohibido", { detail: "Solo un dueño puede asignar el rol dueño." }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaAna = await fila("Ana Pérez");
    await usuario.click(within(filaAna).getByRole("button", { name: /editar/i }));
    await usuario.selectOptions(await screen.findByLabelText(/rol/i), "dueno");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/solo un dueño/i);
  });
});

describe("RF-147 baja de usuario", () => {
  it("RF-147 pide confirmación y da de baja con POST /api/usuarios/{id}/baja", async () => {
    let ruta = "";
    let llamadas = 0;
    servidor.use(
      http.post("*/api/usuarios/:id/baja", ({ request }) => {
        llamadas += 1;
        ruta = new URL(request.url).pathname;
        return HttpResponse.json({ ...ana, activo: false });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaAna = await fila("Ana Pérez");
    await usuario.click(within(filaAna).getByRole("button", { name: /dar de baja/i }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(llamadas).toBe(0);

    await usuario.click(within(dialogo).getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(ruta).toBe(`/api/usuarios/${ana.id}/baja`);
    });
  });

  it("RF-147 no da de baja si se cancela la confirmación", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/usuarios/:id/baja", () => {
        llamadas += 1;
        return HttpResponse.json({ ...ana, activo: false });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaAna = await fila("Ana Pérez");
    await usuario.click(within(filaAna).getByRole("button", { name: /dar de baja/i }));
    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancelar/i }),
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it("RF-147 avisa si falla la baja", async () => {
    servidor.use(http.post("*/api/usuarios/:id/baja", () => problema(500, "Error interno")));
    renderPestana();
    const usuario = userEvent.setup();

    const filaAna = await fila("Ana Pérez");
    await usuario.click(within(filaAna).getByRole("button", { name: /dar de baja/i }));
    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /confirmar/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos guardar/i);
  });

  it("RF-147 un usuario dado de baja no ofrece volver a darlo de baja", async () => {
    servidor.use(
      http.get("*/api/usuarios", () =>
        HttpResponse.json({
          items: [lucia, { ...ana, activo: false }],
          total: 2,
          pagina: 1,
          por_pagina: 50,
        }),
      ),
    );
    renderPestana();

    const filaAna = await fila("Ana Pérez");
    expect(within(filaAna).queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
    expect(within(filaAna).getByText(/inactivo|baja/i)).toBeInTheDocument();
  });
});

describe("RF-149 último admin", () => {
  it("RF-149 muestra el 409 de último admin al darlo de baja", async () => {
    servidor.use(
      http.post("*/api/usuarios/:id/baja", () =>
        problema(409, "Conflicto", {
          detail: "No se puede dar de baja al último administrador.",
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaLucia = await fila("Lucía Fernández");
    await usuario.click(within(filaLucia).getByRole("button", { name: /dar de baja/i }));
    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /confirmar/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/último administrador/i);
  });

  it("RF-149 muestra el 409 de último admin al quitarle el rol admin", async () => {
    servidor.use(
      http.patch("*/api/usuarios/:id", () =>
        problema(409, "Conflicto", {
          detail: "No se puede quitar el rol admin al último administrador.",
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaLucia = await fila("Lucía Fernández");
    await usuario.click(within(filaLucia).getByRole("button", { name: /editar/i }));
    await usuario.selectOptions(await screen.findByLabelText(/rol/i), "empleado");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/último administrador/i);
    expect(screen.getByLabelText(/rol/i)).toBeInTheDocument();
  });
});
