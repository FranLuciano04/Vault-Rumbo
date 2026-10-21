import { crearCliente } from "@rumbo/shared";
import { crearServidor } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import * as firebase from "@/lib/firebase";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { PaginaLogin } from "./PaginaLogin";

vi.mock("@/lib/firebase", () => ({
  iniciarSesionConEmail: vi.fn(),
  iniciarSesionConGoogle: vi.fn(),
  enviarMailRecuperacion: vi.fn(),
  cerrarSesion: vi.fn(),
}));

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
});
afterAll(() => {
  servidor.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(firebase.iniciarSesionConEmail).mockResolvedValue(undefined);
  vi.mocked(firebase.iniciarSesionConGoogle).mockResolvedValue(undefined);
  vi.mocked(firebase.enviarMailRecuperacion).mockResolvedValue(undefined);
  vi.mocked(firebase.cerrarSesion).mockResolvedValue(undefined);
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function renderLogin() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<PaginaLogin cliente={cliente} />} />
          <Route path="/" element={<p>Pantalla principal</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function completarEmail(email = "ana@rumbo.test", password = "secreta123") {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText(/email/i), email);
  await usuario.type(screen.getByLabelText(/contraseña/i), password);
  await usuario.click(screen.getByRole("button", { name: /^ingresar$/i }));
}

describe("RF-140 inicio de sesión", () => {
  it("con email y contraseña llama a Firebase, consulta /auth/yo y entra", async () => {
    renderLogin();
    await completarEmail();

    expect(firebase.iniciarSesionConEmail).toHaveBeenCalledWith("ana@rumbo.test", "secreta123");
    expect(await screen.findByText("Pantalla principal")).toBeInTheDocument();
  });

  it("con Google abre el popup y, si /auth/yo responde 200, entra", async () => {
    renderLogin();
    await userEvent.setup().click(screen.getByRole("button", { name: /google/i }));

    expect(firebase.iniciarSesionConGoogle).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Pantalla principal")).toBeInTheDocument();
  });

  it("A1: si /auth/yo responde 401 cierra la sesión de Firebase y muestra usuario no habilitado", async () => {
    servidor.use(
      http.get("*/api/auth/yo", () => HttpResponse.json({ detail: "no habilitado" }, { status: 401 })),
    );
    renderLogin();
    await completarEmail();

    expect(await screen.findByRole("alert")).toHaveTextContent(/usuario no habilitado/i);
    expect(firebase.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Pantalla principal")).not.toBeInTheDocument();
  });

  it("A1 con Google: un 401 también cierra la sesión y avisa", async () => {
    servidor.use(http.get("*/api/auth/yo", () => HttpResponse.json({}, { status: 401 })));
    renderLogin();
    await userEvent.setup().click(screen.getByRole("button", { name: /google/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/usuario no habilitado/i);
    expect(firebase.cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it("A4: olvidé mi contraseña pide el mail a Firebase y muestra un mensaje neutro", async () => {
    renderLogin();
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/email/i), "ana@rumbo.test");
    await usuario.click(screen.getByRole("button", { name: /olvidaste tu contraseña/i }));

    expect(firebase.enviarMailRecuperacion).toHaveBeenCalledWith("ana@rumbo.test");
    expect(await screen.findByRole("status")).toHaveTextContent(/si el email .*te enviamos/i);
  });

  it("A4: el mensaje es el mismo aunque Firebase diga que el mail no existe", async () => {
    vi.mocked(firebase.enviarMailRecuperacion).mockRejectedValue({ code: "auth/user-not-found" });
    renderLogin();
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/email/i), "nadie@rumbo.test");
    await usuario.click(screen.getByRole("button", { name: /olvidaste tu contraseña/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/si el email .*te enviamos/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("RF-142 credenciales inválidas", () => {
  it("si Firebase rechaza las credenciales muestra el error y no consulta /auth/yo", async () => {
    const yo = vi.fn();
    servidor.use(
      http.get("*/api/auth/yo", () => {
        yo();
        return HttpResponse.json({}, { status: 200 });
      }),
    );
    vi.mocked(firebase.iniciarSesionConEmail).mockRejectedValue({ code: "auth/invalid-credential" });
    renderLogin();
    await completarEmail("ana@rumbo.test", "mala");

    expect(await screen.findByRole("alert")).toHaveTextContent(/credenciales inválidas/i);
    expect(yo).not.toHaveBeenCalled();
    expect(screen.queryByText("Pantalla principal")).not.toBeInTheDocument();
  });

  it("no envía el formulario con el email vacío", async () => {
    renderLogin();
    await userEvent.setup().click(screen.getByRole("button", { name: /^ingresar$/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(firebase.iniciarSesionConEmail).not.toHaveBeenCalled();
  });
});

describe("RF-143 cierre de sesión", () => {
  it("hace signOut y limpia la caché de TanStack Query", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["auth", "yo"], { nombre: "Ana" });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BotonCerrarSesion />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => expect(firebase.cerrarSesion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0));
  });
});
