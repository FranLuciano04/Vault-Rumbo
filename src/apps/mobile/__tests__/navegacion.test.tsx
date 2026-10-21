import { ErrorApi } from "@rumbo/shared";
import { renderRouter } from "expo-router/testing-library";

// Contrato asumido (T-022, CU-24): la guarda de sesión del shell consulta `GET /auth/yo`
// con `useYo` de `@rumbo/shared/hooks`; sin sesión (401 -> ErrorApi) redirige a `/login`
// (grupo `(auth)`) y con sesión muestra `/agenda` dentro de `(pestanas)` con las pestañas
// Agenda, Clientes y Más. El estado de `/auth/yo` se simula mockeando `useYo`.
jest.mock("../global.css", () => ({}));

const mockEstado: { actual: { data?: unknown; error?: unknown; isPending: boolean } } = {
  actual: { isPending: true },
};

jest.mock("@rumbo/shared/hooks", () => ({ useYo: () => mockEstado.actual }));

const usuario = {
  id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
  nombre: "Ana Pérez",
  email: "ana@rumbo.test",
  rol: "empleado",
  acceso_redes: false,
};

function sinSesion() {
  mockEstado.actual = {
    error: Object.assign(new ErrorApi("x"), { status: 401 }),
    isPending: false,
  };
}
function conErrorDeRed() {
  mockEstado.actual = {
    error: Object.assign(new ErrorApi("x"), { status: 503 }),
    isPending: false,
  };
}
function conSesion() {
  mockEstado.actual = { data: usuario, isPending: false };
}

describe("navegación mobile", () => {
  it("CU-24 sin sesión la app abre el login y no muestra las pestañas", async () => {
    sinSesion();
    const vista = await renderRouter("./app", { initialUrl: "/" });
    await vista.findByTestId("pantalla-login");
    expect(vista).toHavePathname("/login");
    expect(vista.queryByRole("tab", { name: "Agenda" })).toBeNull();
  });

  it("CU-24 sin sesión, entrar directo a /clientes también manda al login", async () => {
    sinSesion();
    const vista = await renderRouter("./app", { initialUrl: "/clientes" });
    await vista.findByTestId("pantalla-login");
    expect(vista).toHavePathname("/login");
  });

  it("CU-24 con sesión la app abre la agenda", async () => {
    conSesion();
    const vista = await renderRouter("./app", { initialUrl: "/" });
    await vista.findByTestId("pantalla-agenda");
    expect(vista).toHavePathname("/agenda");
  });

  it("RNF-14 con sesión se ven las pestañas Agenda, Clientes y Más", async () => {
    conSesion();
    const vista = await renderRouter("./app", { initialUrl: "/agenda" });
    await vista.findByTestId("pantalla-agenda");
    expect(vista.getByRole("tab", { name: "Agenda" })).toBeTruthy();
    expect(vista.getByRole("tab", { name: "Clientes" })).toBeTruthy();
    expect(vista.getByRole("tab", { name: "Más" })).toBeTruthy();
  });

  it("CU-24 si /auth/yo falla con un error que no es 401, no muestra las pestañas", async () => {
    conErrorDeRed();
    const vista = await renderRouter("./app", { initialUrl: "/agenda" });
    await vista.findByRole("alert");
    expect(vista.getByText(/No pudimos verificar tu sesión/)).toBeTruthy();
    expect(vista.queryByRole("tab", { name: "Agenda" })).toBeNull();
    expect(vista.queryByTestId("pantalla-agenda")).toBeNull();
  });
});
