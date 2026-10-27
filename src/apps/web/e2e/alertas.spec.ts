import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, elegirContrasena, URL_BASE } from "./compose";

// T-060: agenda de alertas (CU-14, CU-28) contra el backend real. Los datos de partida se
// preparan por la API; lo que se prueba se hace desde la web. Cada test crea su propio empleado:
// así el progreso del día y la agenda arrancan limpios aunque la base se comparta entre specs.
// No depende de la semilla de demo de alertas (`semillas/alertas.py`): crea sus propios datos.
const SUFIJO = String(Date.now());
const CLAVE = "Clave-de-prueba-4";

interface Persona {
  id: string;
  nombre: string;
  email: string;
}

interface AlertaApi {
  id: string;
  descripcion: string;
}

/** Fecha de hoy en Buenos Aires, como la calcula la web (`hoyEnBuenosAires`). */
function hoy(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** dd/mm/aa, el formato de fechas de negocio. */
function ddmmaa(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(2, 4)}`;
}

async function ingresar(pagina: Page, email: string, password: string): Promise<void> {
  await pagina.goto("/login");
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(password);
  const respuesta = pagina.waitForResponse((r) => r.url().includes("/api/auth/yo"));
  await pagina.getByRole("button", { name: "Ingresar" }).click();
  const yo = await respuesta;
  if (!yo.ok()) {
    const aviso = await pagina.getByRole("alert").textContent();
    throw new Error(`Falló el ingreso de ${email}: ${String(yo.status())} ${aviso ?? ""}`);
  }
  await expect(pagina).toHaveURL(/\/agenda$/, { timeout: 15_000 });
}

/** Token de Firebase del emulador, para llamar a la API como esa persona. */
async function tokenDe(email: string, password: string): Promise<string> {
  // HTTP a propósito: el emulador escucha solo en 127.0.0.1 (docker-compose.e2e.yml).
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  const respuesta = await fetch(
    `${EMULADOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const cuerpo = (await respuesta.json()) as { idToken?: string };
  expect(cuerpo.idToken, `el emulador debería dar token a ${email}`).toBeDefined();
  return cuerpo.idToken ?? "";
}

async function api<T>(token: string, metodo: string, ruta: string, cuerpo?: object): Promise<T> {
  // El Compose de e2e publica nginx por HTTP en localhost.
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  const respuesta = await fetch(`${URL_BASE}/api${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  expect(respuesta.ok, `${metodo} ${ruta} respondió ${String(respuesta.status)}`).toBe(true);
  return (await respuesta.json()) as T;
}

/** Alta de una persona del equipo por la API, con contraseña elegida (DEC-0016). */
async function crearPersona(rol: "empleado" | "admin", etiqueta: string): Promise<Persona> {
  const email = `${rol}-${etiqueta}-${SUFIJO}@rumbo.test`;
  const nombre = `${rol === "admin" ? "Admin" : "Empleado"} ${etiqueta} E2E ${SUFIJO}`;
  const duena = await tokenDe(DUENA.email, DUENA.password);
  const { id } = await api<{ id: string }>(duena, "POST", "/usuarios", { nombre, email, rol });
  await elegirContrasena(email, CLAVE);
  return { id, nombre, email };
}

test.describe("CU-28 Crear recordatorio manual", () => {
  test("RF-080 crear recordatorio: el empleado lo crea, lo ve en la agenda y el progreso lo cuenta", async ({
    page,
  }) => {
    const empleado = await crearPersona("empleado", "crear");
    const descripcion = `Llamar a la mayorista ${SUFIJO}`;

    await ingresar(page, empleado.email, CLAVE);
    await expect(page.getByRole("heading", { name: "Agenda del día", level: 1 })).toBeVisible();
    await expect(page.getByText("Llevás 0 de 0 alertas resueltas")).toBeVisible();

    await page.getByRole("button", { name: "Nuevo recordatorio" }).first().click();
    const formulario = page.getByRole("form", { name: "Nuevo recordatorio" });
    await formulario.getByLabel("Descripción").fill(descripcion);
    await formulario.getByLabel("Fecha").fill(hoy());
    await formulario.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Recordatorio creado para el" })).toContainText(
      ddmmaa(hoy()),
    );
    await expect(page.getByText(descripcion)).toBeVisible();
    await expect(page.getByText("Llevás 0 de 1 alertas resueltas")).toBeVisible();
  });

  test("RF-080 crear recordatorio: una fecha vacía se rechaza y no se crea nada", async ({
    page,
  }) => {
    const empleado = await crearPersona("empleado", "invalido");
    const descripcion = `Sin fecha ${SUFIJO}`;

    await ingresar(page, empleado.email, CLAVE);
    await page.getByRole("button", { name: "Nuevo recordatorio" }).first().click();
    const formulario = page.getByRole("form", { name: "Nuevo recordatorio" });
    await formulario.getByLabel("Descripción").fill(descripcion);
    await formulario.getByRole("button", { name: "Guardar" }).click();

    // El formulario sigue abierto con el error y nada aparece en la agenda.
    await expect(formulario).toBeVisible();
    await expect(formulario.getByLabel("Fecha")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Recordatorio creado para el")).toHaveCount(0);
    await expect(page.getByText("Llevás 0 de 0 alertas resueltas")).toBeVisible();
  });
});

test.describe("CU-14 Ver y atender alertas del día", () => {
  test("RF-076 resolver: la alerta sale de la agenda y el progreso del día cambia", async ({
    page,
  }) => {
    const empleado = await crearPersona("empleado", "resolver");
    const descripcion = `Resolver recordatorio ${SUFIJO}`;
    const token = await tokenDe(empleado.email, CLAVE);
    await api<AlertaApi>(token, "POST", "/alertas", { descripcion, fecha: hoy() });

    await ingresar(page, empleado.email, CLAVE);
    await expect(page.getByText(descripcion)).toBeVisible();
    await expect(page.getByText("Llevás 0 de 1 alertas resueltas")).toBeVisible();

    await page.getByRole("button", { name: `Resolver: ${descripcion}` }).click();

    // La web da una ventana para deshacer antes de enviar la resolución al servidor.
    await expect(page.getByText("Alerta resuelta")).toBeVisible();
    await expect(page.getByText(descripcion)).toHaveCount(0);
    await expect(page.getByText("Llevás 1 de 1 alertas resueltas")).toBeVisible({
      timeout: 20_000,
    });

    // Quedó persistida: al recargar sigue resuelta.
    await page.reload();
    await expect(page.getByText("Llevás 1 de 1 alertas resueltas")).toBeVisible();
    await expect(page.getByText(descripcion)).toHaveCount(0);
  });

  test("RF-077 posponer: la alerta pasa a próximas", async ({ page }) => {
    const empleado = await crearPersona("empleado", "posponer");
    const descripcion = `Posponer recordatorio ${SUFIJO}`;
    const nuevaFecha = sumarDias(hoy(), 3);
    const token = await tokenDe(empleado.email, CLAVE);
    await api<AlertaApi>(token, "POST", "/alertas", { descripcion, fecha: hoy() });

    await ingresar(page, empleado.email, CLAVE);
    await expect(page.getByText(descripcion)).toBeVisible();

    await page.getByRole("button", { name: `Posponer: ${descripcion}` }).click();
    await page.getByLabel("Nueva fecha").fill(nuevaFecha);
    await page.getByRole("button", { name: "Confirmar" }).click();

    // Sale de la agenda de hoy...
    await expect(page.getByText(descripcion)).toHaveCount(0);
    // ...y aparece en Próximas con su fecha nueva.
    await page.getByRole("tab", { name: /Próximas/ }).click();
    const fila = page.getByRole("listitem").filter({ hasText: descripcion });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(ddmmaa(nuevaFecha));
  });

  test("RF-078 agenda de la agencia: la admin ve las alertas de otros con su responsable", async ({
    page,
  }) => {
    const empleado = await crearPersona("empleado", "agencia");
    const admin = await crearPersona("admin", "agencia");
    const descripcion = `Alerta del equipo ${SUFIJO}`;
    const token = await tokenDe(empleado.email, CLAVE);
    await api<AlertaApi>(token, "POST", "/alertas", { descripcion, fecha: hoy() });

    await ingresar(page, admin.email, CLAVE);
    await expect(page.getByText("Principal · Toda la agencia")).toBeVisible();
    const fila = page.getByRole("listitem").filter({ hasText: descripcion });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(empleado.nombre);
    await expect(page.getByText(/La agencia lleva \d+ de \d+ alertas resueltas/)).toBeVisible();

    // Filtrar por responsable deja solo las de esa persona.
    await page.getByLabel("Responsable").selectOption({ label: empleado.nombre });
    await expect(fila).toBeVisible();
    await page.getByLabel("Responsable").selectOption({ label: admin.nombre });
    await expect(page.getByText(descripcion)).toHaveCount(0);
  });
});
