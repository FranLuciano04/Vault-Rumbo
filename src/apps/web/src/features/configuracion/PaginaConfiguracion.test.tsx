import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadoresM1, usuariosMock } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PaginaConfiguracion } from "./PaginaConfiguracion";

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

function renderPagina() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <PaginaConfiguracion cliente={cliente} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const problema = (status: number, title: string, extra: object = {}) =>
  HttpResponse.json(
    { title, status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

const vigencia = () => screen.findByLabelText(/vigencia de la cotización/i);
const guardarParametros = () => screen.getByRole("button", { name: /guardar parámetros/i });

describe("RF-083 pestañas de Configuración", () => {
  it("RF-083 muestra las cuatro pestañas del prototipo, con Parámetros seleccionada", async () => {
    renderPagina();

    const pestanas = await screen.findAllByRole("tab");
    expect(pestanas.map((p) => p.textContent.trim())).toEqual([
      "Parámetros y comisiones",
      "Usuarios y roles",
      "Destinos y requisitos",
      "Operadores",
    ]);
    expect(screen.getByRole("tab", { name: /parámetros y comisiones/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("RF-093 pestaña Operadores", () => {
  it("RF-093 la pestaña Operadores está habilitada y muestra el catálogo", async () => {
    renderPagina();
    const usuario = userEvent.setup();

    const pestana = await screen.findByRole("tab", { name: /operadores/i });
    expect(pestana).toBeEnabled();
    await usuario.click(pestana);

    expect(pestana).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Despegar Mayorista")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo operador/i })).toBeInTheDocument();
  });
});

describe("RF-084 parámetros del negocio", () => {
  it("RF-084 precarga los valores vigentes del servidor", async () => {
    renderPagina();

    await waitFor(async () => {
      expect(await vigencia()).toHaveValue(1);
    });
    expect(screen.getByLabelText(/anticipación.*salida/i)).toHaveValue(7);
    expect(screen.getByLabelText(/recontacto/i)).toHaveValue(6);
  });

  it("RF-084 guarda con PUT /api/configuracion los valores editados", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.put("*/api/configuracion", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(cuerpo);
      }),
    );
    renderPagina();
    const usuario = userEvent.setup();

    const campo = await vigencia();
    await usuario.clear(campo);
    await usuario.type(campo, "3");
    await usuario.click(guardarParametros());

    await waitFor(() => {
      expect(cuerpo).toEqual({
        vigencia_cotizacion_meses: 3,
        anticipacion_salida_dias: 7,
        recontacto_meses: 6,
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/guardad/i);
  });

  it("RF-084 con un valor inválido marca el campo y no llama al servidor", async () => {
    let llamadas = 0;
    servidor.use(
      http.put("*/api/configuracion", () => {
        llamadas += 1;
        return HttpResponse.json({});
      }),
    );
    renderPagina();
    const usuario = userEvent.setup();

    const campo = await vigencia();
    await usuario.clear(campo);
    await usuario.type(campo, "0");
    await usuario.click(guardarParametros());

    await waitFor(() => {
      expect(campo).toBeInvalid();
    });
    expect(llamadas).toBe(0);
  });

  it("RF-084 un campo vacío no se envía y queda marcado", async () => {
    let llamadas = 0;
    servidor.use(
      http.put("*/api/configuracion", () => {
        llamadas += 1;
        return HttpResponse.json({});
      }),
    );
    renderPagina();
    const usuario = userEvent.setup();

    const campo = await screen.findByLabelText(/recontacto/i);
    await usuario.clear(campo);
    await usuario.click(guardarParametros());

    await waitFor(() => {
      expect(campo).toBeInvalid();
    });
    expect(llamadas).toBe(0);
  });

  it("RF-084 muestra en su campo el 422 que devuelve el servidor", async () => {
    servidor.use(
      http.put("*/api/configuracion", () =>
        problema(422, "Datos inválidos", {
          errores: [
            { campo: "anticipacion_salida_dias", mensaje: "Debe ser menor que la vigencia." },
          ],
        }),
      ),
    );
    renderPagina();
    const usuario = userEvent.setup();

    await vigencia();
    await usuario.click(guardarParametros());

    expect(await screen.findByText("Debe ser menor que la vigencia.")).toBeInTheDocument();
    expect(screen.getByLabelText(/anticipación.*salida/i)).toBeInvalid();
    expect(screen.getByLabelText(/vigencia de la cotización/i)).toBeValid();
  });

  it("RF-084 ante un error 500 avisa sin perder lo escrito", async () => {
    servidor.use(http.put("*/api/configuracion", () => problema(500, "Error interno")));
    renderPagina();
    const usuario = userEvent.setup();

    const campo = await vigencia();
    await usuario.clear(campo);
    await usuario.type(campo, "4");
    await usuario.click(guardarParametros());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(campo).toHaveValue(4);
  });
});

describe("RF-084 carga de los parámetros", () => {
  it("RF-084 si falla el GET de la configuración avisa en lugar del formulario", async () => {
    servidor.use(http.get("*/api/configuracion", () => problema(500, "Error interno")));
    renderPagina();

    expect(await screen.findByText(/no pudimos cargar los parámetros/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar parámetros/i })).not.toBeInTheDocument();
  });
});

describe("RF-083 comisión por defecto por vendedor", () => {
  async function elegirVendedor(nombre: string) {
    const usuario = userEvent.setup();
    const selector = await screen.findByRole("combobox", { name: /vendedor/i });
    const opcion = await screen.findByRole("option", { name: new RegExp(nombre, "i") });
    await usuario.selectOptions(selector, opcion);
    return usuario;
  }
  const tipo = () => screen.getByRole("combobox", { name: /tipo de comisión/i });
  const valor = () => screen.getByLabelText(/valor de la comisión/i);
  const guardar = () => screen.getByRole("button", { name: /guardar comisión/i });

  it("RF-083 lista a los usuarios y precarga la comisión actual del elegido", async () => {
    renderPagina();

    await elegirVendedor("Ana Pérez");

    expect(tipo()).toHaveValue("porcentaje");
    expect(valor()).toHaveValue(10);
  });

  it("RF-083 guarda un porcentaje con PUT /api/usuarios/{id}/comision-por-defecto", async () => {
    let ruta = "";
    let cuerpo: JsonBodyType;
    servidor.use(
      http.put("*/api/usuarios/:id/comision-por-defecto", async ({ request }) => {
        ruta = new URL(request.url).pathname;
        cuerpo = await request.json();
        return HttpResponse.json(usuariosMock[1]);
      }),
    );
    renderPagina();
    const usuario = await elegirVendedor("Ana Pérez");

    await usuario.clear(valor());
    await usuario.type(valor(), "12.5");
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpo).toEqual({ comision_default_tipo: "porcentaje", comision_default_valor: 12.5 });
    });
    expect(ruta).toBe(`/api/usuarios/${usuariosMock[1].id}/comision-por-defecto`);
  });

  it("RF-083 guarda un importe fijo al cambiar el tipo", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.put("*/api/usuarios/:id/comision-por-defecto", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(usuariosMock[1]);
      }),
    );
    renderPagina();
    const usuario = await elegirVendedor("Ana Pérez");

    await usuario.selectOptions(tipo(), "importe");
    await usuario.clear(valor());
    await usuario.type(valor(), "20000");
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpo).toEqual({ comision_default_tipo: "importe", comision_default_valor: 20000 });
    });
  });

  it.each([
    ["porcentaje", "150"],
    ["porcentaje", "-5"],
    ["importe", "-1"],
  ])(
    "RF-083 rechaza %s con valor %s sin llamar al servidor (CU-13 A1)",
    async (tipoComision, texto) => {
      let llamadas = 0;
      servidor.use(
        http.put("*/api/usuarios/:id/comision-por-defecto", () => {
          llamadas += 1;
          return HttpResponse.json(usuariosMock[1]);
        }),
      );
      renderPagina();
      const usuario = await elegirVendedor("Ana Pérez");

      await usuario.selectOptions(tipo(), tipoComision);
      await usuario.clear(valor());
      await usuario.type(valor(), texto);
      await usuario.click(guardar());

      await waitFor(() => {
        expect(valor()).toBeInvalid();
      });
      expect(llamadas).toBe(0);
    },
  );

  it("RF-083 muestra en el campo el 422 del servidor", async () => {
    servidor.use(
      http.put("*/api/usuarios/:id/comision-por-defecto", () =>
        problema(422, "Datos inválidos", {
          errores: [
            { campo: "comision_default_valor", mensaje: "El porcentaje no puede superar 100." },
          ],
        }),
      ),
    );
    renderPagina();
    const usuario = await elegirVendedor("Ana Pérez");

    await usuario.click(guardar());

    expect(await screen.findByText("El porcentaje no puede superar 100.")).toBeInTheDocument();
    expect(valor()).toBeInvalid();
  });

  it("RF-083 un 422 sin campo propio (body) se muestra en el aviso general", async () => {
    servidor.use(
      http.put("*/api/usuarios/:id/comision-por-defecto", () =>
        problema(422, "Datos inválidos", {
          errores: [{ campo: "body", mensaje: "Combinación de comisión inválida." }],
        }),
      ),
    );
    renderPagina();
    const usuario = await elegirVendedor("Ana Pérez");

    await usuario.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent("Combinación de comisión inválida.");
    expect(valor()).toBeValid();
  });

  it("RF-083 un usuario sin comisión queda con el valor vacío y lo indica", async () => {
    renderPagina();

    await elegirVendedor("Lucía Fernández");

    expect(screen.getByText(/sin comisión configurada/i)).toBeInTheDocument();
    expect(valor()).toHaveValue(null);
  });

  it("RF-083 si falla el listado de usuarios avisa en lugar del formulario", async () => {
    servidor.use(http.get("*/api/usuarios", () => problema(500, "Error interno")));
    renderPagina();

    expect(await screen.findByText(/no pudimos cargar los vendedores/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar comisión/i })).not.toBeInTheDocument();
  });

  it("RF-083 permite configurar a un usuario dado de baja (CU-13, decisión 22/10/26)", async () => {
    const baja = {
      ...usuariosMock[2],
      id: "11111111-1111-4111-8111-111111111111",
      nombre: "Lucía Baja",
      email: "lucia@rumbo.test",
      activo: false,
    };
    servidor.use(
      http.get("*/api/usuarios", () =>
        HttpResponse.json({ items: [...usuariosMock, baja], total: 4, pagina: 1, por_pagina: 50 }),
      ),
    );
    renderPagina();

    await elegirVendedor("Lucía Baja");

    expect(guardar()).toBeEnabled();
  });
});
