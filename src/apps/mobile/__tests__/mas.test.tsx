import { Text } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Mas from "../app/(pestanas)/mas";
import * as firebase from "../src/lib/firebase";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({
  iniciarSesionConEmail: jest.fn(),
  iniciarSesionConGoogle: jest.fn(),
  enviarMailRecuperacion: jest.fn(),
  cerrarSesion: jest.fn(),
  obtenerTokenId: jest.fn(),
}));

const queryClient = new QueryClient();
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
  queryClient.clear();
  jest.mocked(firebase.cerrarSesion).mockResolvedValue(undefined);
});

function Raiz() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

function renderMas() {
  return renderRouter(
    {
      _layout: Raiz,
      "(pestanas)/mas": Mas,
      "(auth)/login": () => <Text>Pantalla de login</Text>,
    },
    { initialUrl: "/mas" },
  );
}

describe("RF-143 pestaña Más", () => {
  it("muestra el perfil de la persona con sesión (nombre y email de /auth/yo)", async () => {
    const vista = await renderMas();

    await vista.findByText(usuario.nombre);
    expect(vista.getByText(usuario.email)).toBeTruthy();
  });

  it("cerrar sesión hace signOut, limpia la caché de TanStack Query y vuelve al login", async () => {
    const vista = await renderMas();
    await vista.findByText(usuario.nombre);
    fireEvent.press(vista.getByRole("button", { name: /cerrar sesión/i }));

    await vista.findByText("Pantalla de login");
    expect(firebase.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("si signOut falla igual limpia la caché y vuelve al login", async () => {
    jest.mocked(firebase.cerrarSesion).mockRejectedValue(new Error("sin red"));
    const vista = await renderMas();
    await vista.findByText(usuario.nombre);
    fireEvent.press(vista.getByRole("button", { name: /cerrar sesión/i }));

    await vista.findByText("Pantalla de login");
    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0));
  });
});
