import { expect, type Page, test } from "@playwright/test";
import { DUENA, NO_HABILITADO } from "./compose";

async function ingresar(pagina: Page, email: string, password: string): Promise<void> {
  await pagina.goto("/login");
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(password);
  await pagina.getByRole("button", { name: "Ingresar" }).click();
}

test.describe("CU-24 Iniciar sesión", () => {
  test("RF-140 la dueña inicia sesión", async ({ page }) => {
    await ingresar(page, DUENA.email, DUENA.password);

    // Tras entrar, la raíz redirige a la primera sección del rol (agenda).
    await expect(page).toHaveURL(/\/agenda$/);
    await expect(page.getByText(DUENA.nombre)).toBeVisible();
    await expect(page.getByText("Dueño", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });

  test("RF-142 credenciales inválidas", async ({ page }) => {
    await ingresar(page, DUENA.email, "Clave-equivocada-9");

    await expect(page.getByRole("alert")).toContainText("Credenciales inválidas");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("RF-142 usuario no habilitado", async ({ page }) => {
    await ingresar(page, NO_HABILITADO.email, NO_HABILITADO.password);

    await expect(page.getByRole("alert")).toContainText("Usuario no habilitado en Rumbo");
    await expect(page).toHaveURL(/\/login$/);
    // No queda sesión abierta: sin ella, una ruta protegida vuelve al login.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("RF-143 cierra la sesión", async ({ page }) => {
    await ingresar(page, DUENA.email, DUENA.password);
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
