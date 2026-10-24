import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR } from "./compose";

// T-038: flujos de Configuración (CU-25, CU-26, CU-31, CU-13) contra el backend real.
// Los nombres llevan un sufijo único: la base y el emulador se comparten entre specs.
const SUFIJO = String(Date.now());
const CLAVE_EMPLEADO = "Clave-de-prueba-2";

async function ingresar(pagina: Page, email: string, password: string): Promise<void> {
  await pagina.goto("/login");
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(password);
  await pagina.getByRole("button", { name: "Ingresar" }).click();
  await expect(pagina).toHaveURL(/\/agenda$/);
}

async function abrirConfiguracion(pagina: Page, pestana: string): Promise<void> {
  await pagina.getByRole("link", { name: "Configuración" }).click();
  await expect(pagina.getByRole("heading", { name: "Configuración", level: 1 })).toBeVisible();
  await pagina.getByRole("tab", { name: pestana }).click();
}

/** Da de alta un empleado desde «Usuarios y roles» (la dueña ya inició sesión). */
async function altaDeEmpleado(pagina: Page, nombre: string, email: string): Promise<void> {
  await abrirConfiguracion(pagina, "Usuarios y roles");
  await pagina.getByRole("button", { name: "Nuevo usuario" }).click();
  const formulario = pagina.getByRole("form", { name: "Nuevo usuario" });
  await formulario.getByLabel("Nombre").fill(nombre);
  await formulario.getByLabel("Email").fill(email);
  await formulario.getByLabel("Rol").selectOption({ label: "Empleado" });
  await formulario.getByRole("button", { name: "Guardar" }).click();
  await expect(pagina.getByRole("row", { name: new RegExp(nombre) })).toBeVisible();
}

/**
 * El alta crea la cuenta sin contraseña y pide el mail de restablecimiento (DEC-0016). El
 * emulador guarda el código de ese mail: se usa para elegir la contraseña como lo haría la persona.
 */
async function elegirContrasena(email: string, password: string): Promise<void> {
  // HTTP a propósito: el emulador escucha solo en 127.0.0.1 (docker-compose.e2e.yml).
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  const codigos = await fetch(`${EMULADOR}/emulator/v1/projects/demo-rumbo/oobCodes`);
  const { oobCodes } = (await codigos.json()) as {
    oobCodes: { email: string; oobCode: string; requestType: string }[];
  };
  const codigo = oobCodes.findLast((c) => c.email === email && c.requestType === "PASSWORD_RESET");
  expect(codigo, `el emulador debería tener el mail de restablecimiento de ${email}`).toBeDefined();
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  const respuesta = await fetch(
    `${EMULADOR}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode: codigo?.oobCode, newPassword: password }),
    },
  );
  expect(respuesta.ok).toBe(true);
}

test.describe("CU-25 Gestionar usuarios y roles", () => {
  test("RF-144 alta de empleado: inicia sesión y no ve Configuración", async ({ page }) => {
    const nombre = `Empleada E2E ${SUFIJO}`;
    const email = `empleada-${SUFIJO}@rumbo.test`;
    await ingresar(page, DUENA.email, DUENA.password);

    await altaDeEmpleado(page, nombre, email);
    const fila = page.getByRole("row", { name: new RegExp(nombre) });
    await expect(fila).toContainText("Empleado");
    await expect(fila).toContainText("Activo");

    await elegirContrasena(email, CLAVE_EMPLEADO);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await ingresar(page, email, CLAVE_EMPLEADO);
    await expect(page.getByText(nombre)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0);
    // Entrando por la URL, la sección devuelve a la agenda.
    await page.goto("/configuracion");
    await expect(page).toHaveURL(/\/agenda$/);
  });
});

test.describe("CU-26 Gestionar destinos", () => {
  test("RF-089 destino con requisito: alta, baja y reactivación", async ({ page }) => {
    const destino = `Destino E2E ${SUFIJO}`;
    await ingresar(page, DUENA.email, DUENA.password);
    await abrirConfiguracion(page, "Destinos y requisitos");

    await page.getByRole("button", { name: "Nuevo destino" }).click();
    const formulario = page.getByRole("form", { name: "Nuevo destino" });
    await formulario.getByLabel("Nombre").fill(destino);
    await formulario.getByLabel("País").fill("Argentina");
    await formulario.getByRole("button", { name: "Guardar" }).click();
    const fila = page.getByRole("row", { name: new RegExp(destino) });
    await expect(fila).toBeVisible();

    await fila.getByRole("button", { name: "Requisitos" }).click();
    await expect(page.getByRole("heading", { name: `Requisitos de ${destino}` })).toBeVisible();
    await page.getByRole("button", { name: "Agregar requisito" }).click();
    const requisito = page.getByRole("form", { name: "Nuevo requisito" });
    await requisito.getByLabel("Nombre").fill("Pasaporte vigente");
    await requisito.getByLabel("Tipo").selectOption({ label: "Documentación" });
    await requisito.getByLabel("Obligatorio").check();
    await requisito.getByLabel("Anticipación (días)").fill("30");
    await requisito.getByRole("button", { name: "Guardar requisito" }).click();
    const filaRequisito = page.getByRole("row", { name: /Pasaporte vigente/ });
    await expect(filaRequisito).toContainText("Obligatorio");
    await expect(filaRequisito).toContainText("30 días antes");

    // Baja lógica: desaparece de los activos y aparece al ver inactivos.
    await fila.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByRole("row", { name: new RegExp(destino) })).toHaveCount(0);
    await page.getByLabel("Ver inactivos").check();
    const filaInactiva = page.getByRole("row", { name: new RegExp(destino) });
    await expect(filaInactiva).toBeVisible();

    await filaInactiva.getByRole("button", { name: "Reactivar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(destino) })).toHaveCount(0);
    await page.getByLabel("Ver inactivos").uncheck();
    await expect(page.getByRole("row", { name: new RegExp(destino) })).toBeVisible();
  });
});

test.describe("CU-31 Gestionar operadores", () => {
  test("RF-094 operador duplicado rechazado", async ({ page }) => {
    const operador = `Operador E2E ${SUFIJO}`;
    await ingresar(page, DUENA.email, DUENA.password);
    await abrirConfiguracion(page, "Operadores");

    await page.getByRole("button", { name: "Nuevo operador" }).click();
    let formulario = page.getByRole("form", { name: "Nuevo operador" });
    await formulario.getByLabel("Nombre").fill(operador);
    await formulario.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(operador) })).toHaveCount(1);

    await page.getByRole("button", { name: "Nuevo operador" }).click();
    formulario = page.getByRole("form", { name: "Nuevo operador" });
    await formulario.getByLabel("Nombre").fill(operador);
    await formulario.getByRole("button", { name: "Guardar" }).click();

    await expect(formulario.getByRole("alert")).toContainText("Ya existe un operador llamado");
    // El formulario sigue abierto y no se duplicó la fila.
    await expect(formulario).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(operador) })).toHaveCount(1);
  });
});

test.describe("CU-13 Configurar parámetros y comisiones", () => {
  test("RF-083 comisión por defecto", async ({ page }) => {
    const nombre = `Vendedor E2E ${SUFIJO}`;
    await ingresar(page, DUENA.email, DUENA.password);
    await altaDeEmpleado(page, nombre, `vendedor-${SUFIJO}@rumbo.test`);

    await page.getByRole("tab", { name: "Parámetros y comisiones" }).click();
    await page.getByLabel("Vendedor").selectOption({ label: nombre });
    await expect(page.getByText("Sin comisión configurada.")).toBeVisible();
    await page.getByLabel("Tipo de comisión").selectOption({ label: "Porcentaje (%)" });
    await page.getByLabel("Valor de la comisión").fill("12.5");
    await page.getByRole("button", { name: "Guardar comisión" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Comisión guardada." })).toBeVisible();

    // Persistió: recargando y eligiendo de nuevo al vendedor, el valor sigue.
    await page.reload();
    await page.getByRole("tab", { name: "Parámetros y comisiones" }).click();
    await page.getByLabel("Vendedor").selectOption({ label: nombre });
    await expect(page.getByLabel("Valor de la comisión")).toHaveValue("12.5");
  });
});
