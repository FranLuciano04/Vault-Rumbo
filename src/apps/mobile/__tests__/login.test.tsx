import { Text } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "../app/(auth)/login";
import * as firebase from "../src/lib/firebase";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({
  iniciarSesionConEmail: jest.fn(),
  iniciarSesionConGoogle: jest.fn(),
  enviarMailRecuperacion: jest.fn(),
  cerrarSesion: jest.fn(),
  obtenerTokenId: jest.fn(),
}));

// MSW no carga bajo jest-expo (sus dependencias ESM, p. ej. `rettime`, no se transforman) y la
// config de Jest no es de este ticket: se usa el cliente real de `@rumbo/shared` (interceptores
// incluidos, o sea el 401 llega como ErrorApi) con un adaptador HTTP falso para GET /api/auth/yo.
const mockYo = jest.fn();
jest.mock("../src/cliente", () => {
  const { crearCliente } = require("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = (config: unknown) => mockYo(config);
  return { cliente };
});

const usuario = {
  id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
  nombre: "Ana Pérez",
  email: "ana@rumbo.test",
  rol: "empleado",
  acceso_redes: false,
};

function responderYo(status: number, data: unknown = {}) {
  mockYo.mockImplementation((config: unknown) => {
    const response = { data, status, statusText: "", headers: {}, config };
    return status < 400
      ? Promise.resolve(response)
      : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  responderYo(200, usuario);
  jest.mocked(firebase.iniciarSesionConEmail).mockResolvedValue(undefined);
  jest.mocked(firebase.iniciarSesionConGoogle).mockResolvedValue(undefined);
  jest.mocked(firebase.enviarMailRecuperacion).mockResolvedValue(undefined);
  jest.mocked(firebase.cerrarSesion).mockResolvedValue(undefined);
});

const queryClient = new QueryClient();
function Raiz() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

// Contrato asumido: tras un login correcto la app sale de /login (hacia "/" o "/agenda").
function renderLogin() {
  queryClient.clear();
  return renderRouter(
    {
      _layout: Raiz,
      "(auth)/login": Login,
      index: () => <Text>Pantalla principal</Text>,
      "(pestanas)/agenda": () => <Text>Pantalla principal</Text>,
    },
    { initialUrl: "/login" },
  );
}

function completarEmail(
  vista: Awaited<ReturnType<typeof renderLogin>>,
  email = "ana@rumbo.test",
  password = "secreta123",
) {
  fireEvent.changeText(vista.getByLabelText(/email/i), email);
  fireEvent.changeText(vista.getByLabelText(/contraseña/i), password);
  fireEvent.press(vista.getByRole("button", { name: /^ingresar$/i }));
}

describe("RF-140 inicio de sesión mobile", () => {
  it("con email y contraseña llama a Firebase, consulta /auth/yo y entra", async () => {
    const vista = await renderLogin();
    completarEmail(vista);

    await vista.findByText("Pantalla principal");
    expect(firebase.iniciarSesionConEmail).toHaveBeenCalledWith("ana@rumbo.test", "secreta123");
  });

  it("con Google inicia el flujo nativo y, si /auth/yo responde 200, entra", async () => {
    const vista = await renderLogin();
    fireEvent.press(vista.getByRole("button", { name: /google/i }));

    await vista.findByText("Pantalla principal");
    expect(firebase.iniciarSesionConGoogle).toHaveBeenCalledTimes(1);
  });

  it("A1: si /auth/yo responde 401 cierra la sesión de Firebase y muestra usuario no habilitado", async () => {
    responderYo(401);
    const vista = await renderLogin();
    completarEmail(vista);

    await vista.findByText(/usuario no habilitado/i);
    expect(vista.getByRole("alert")).toBeTruthy();
    expect(firebase.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(vista.queryByText("Pantalla principal")).toBeNull();
  });

  it("A1 con Google: un 401 también cierra la sesión y avisa", async () => {
    responderYo(401);
    const vista = await renderLogin();
    fireEvent.press(vista.getByRole("button", { name: /google/i }));

    await vista.findByText(/usuario no habilitado/i);
    expect(firebase.cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it("A2: si la persona cancela el selector de Google no hay error ni se consulta /auth/yo", async () => {
    const yo = jest.fn();
    mockYo.mockImplementation(() => {
      yo();
      return Promise.resolve({ data: usuario, status: 200 });
    });
    jest.mocked(firebase.iniciarSesionConGoogle).mockRejectedValue({ code: "SIGN_IN_CANCELLED" });
    const vista = await renderLogin();
    fireEvent.press(vista.getByRole("button", { name: /google/i }));

    await waitFor(() => expect(firebase.iniciarSesionConGoogle).toHaveBeenCalled());
    expect(vista.queryByRole("alert")).toBeNull();
    expect(yo).not.toHaveBeenCalled();
    expect(vista).toHavePathname("/login");
  });
});

describe("RF-142 credenciales inválidas y olvidé mi contraseña", () => {
  it("si Firebase rechaza las credenciales muestra el error y no consulta /auth/yo", async () => {
    const yo = jest.fn();
    mockYo.mockImplementation(() => {
      yo();
      return Promise.resolve({ data: usuario, status: 200 });
    });
    jest
      .mocked(firebase.iniciarSesionConEmail)
      .mockRejectedValue({ code: "auth/invalid-credential" });
    const vista = await renderLogin();
    completarEmail(vista, "ana@rumbo.test", "mala");

    await vista.findByText(/credenciales inválidas/i);
    expect(yo).not.toHaveBeenCalled();
    expect(vista).toHavePathname("/login");
  });

  it("no envía el formulario con el email vacío", async () => {
    const vista = await renderLogin();
    fireEvent.press(vista.getByRole("button", { name: /^ingresar$/i }));

    await vista.findByRole("alert");
    expect(firebase.iniciarSesionConEmail).not.toHaveBeenCalled();
  });

  it("A4: olvidé mi contraseña pide el mail a Firebase y muestra un mensaje neutro", async () => {
    const vista = await renderLogin();
    fireEvent.changeText(vista.getByLabelText(/email/i), "ana@rumbo.test");
    fireEvent.press(vista.getByRole("button", { name: /olvidaste tu contraseña/i }));

    await vista.findByText(/si el email .*te enviamos/i);
    expect(firebase.enviarMailRecuperacion).toHaveBeenCalledWith("ana@rumbo.test");
  });

  it("A4: el mensaje es el mismo aunque Firebase diga que el mail no existe", async () => {
    jest
      .mocked(firebase.enviarMailRecuperacion)
      .mockRejectedValue({ code: "auth/user-not-found" });
    const vista = await renderLogin();
    fireEvent.changeText(vista.getByLabelText(/email/i), "nadie@rumbo.test");
    fireEvent.press(vista.getByRole("button", { name: /olvidaste tu contraseña/i }));

    await vista.findByText(/si el email .*te enviamos/i);
    expect(vista.queryByRole("alert")).toBeNull();
  });

  it("A4: sin email no pide el mail a Firebase", async () => {
    const vista = await renderLogin();
    fireEvent.press(vista.getByRole("button", { name: /olvidaste tu contraseña/i }));

    await waitFor(() => expect(vista.queryByText(/si el email .*te enviamos/i)).toBeNull());
    expect(firebase.enviarMailRecuperacion).not.toHaveBeenCalled();
  });
});
