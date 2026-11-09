import { expect, test } from "@playwright/test";
import { api, hoy, ingresar, SUFIJO, tokenDe } from "./apoyo";
import { DUENA, elegirContrasena, URL_BASE } from "./compose";

// T-134: la planificación de contenido en redes (CU-19) y la propuesta con IA (CU-20) contra el
// backend real, con la IA falsa del Compose de e2e (IA_MODELO=falso). No depende de la semilla de
// demo de redes: cada test crea sus propias piezas, con título único por SUFIJO.
const CLAVE = "Clave-de-prueba-6";

/** Alta de una persona del equipo por la API, con contraseña elegida (DEC-0016). */
async function crearEmpleado(etiqueta: string, accesoRedes: boolean): Promise<string> {
  const email = `empleado-redes-${etiqueta}-${SUFIJO}@rumbo.test`;
  const duena = await tokenDe(DUENA.email, DUENA.password);
  await api(duena, "POST", "/usuarios", {
    nombre: `Empleado Redes ${etiqueta} E2E ${SUFIJO}`,
    email,
    rol: "empleado",
    acceso_redes: accesoRedes,
  });
  await elegirContrasena(email, CLAVE);
  return email;
}

test.describe("CU-19 Planificar contenido en redes", () => {
  test("RF-113 RF-114 la dueña crea una pieza, la mueve por el tablero y la descarta", async ({
    page,
  }) => {
    const titulo = `Pieza tablero E2E ${SUFIJO}`;
    await ingresar(page, DUENA.email, DUENA.password);

    await page.getByRole("link", { name: "Redes" }).click();
    await expect(page.getByRole("heading", { name: "Contenido en redes", level: 1 })).toBeVisible();

    // RF-113: alta; la pieza nace en la columna Idea.
    await page.getByRole("button", { name: "Nueva pieza" }).click();
    const alta = page.getByRole("form", { name: "Alta de pieza" });
    await alta.getByLabel("Título").fill(titulo);
    await alta.getByLabel("Canal").selectOption({ label: "Instagram" });
    await alta.getByLabel("Fecha de publicación").fill(hoy());
    await alta.getByRole("button", { name: "Crear" }).click();

    const tarjeta = page.getByRole("article").filter({ hasText: titulo });
    const columna = (nombre: string) =>
      page.getByRole("region").filter({ has: page.getByRole("heading", { name: nombre }) });
    await expect(columna("Idea").getByRole("article").filter({ hasText: titulo })).toBeVisible();

    // RF-114: avanza por Idea, En producción, Listo, y retrocede.
    await tarjeta.getByRole("button", { name: "Avanzar a En producción" }).click();
    await expect(
      columna("En producción").getByRole("article").filter({ hasText: titulo }),
    ).toBeVisible();
    await tarjeta.getByRole("button", { name: "Avanzar a Listo" }).click();
    await expect(columna("Listo").getByRole("article").filter({ hasText: titulo })).toBeVisible();
    await tarjeta.getByRole("button", { name: "Retroceder a En producción" }).click();
    await expect(
      columna("En producción").getByRole("article").filter({ hasText: titulo }),
    ).toBeVisible();

    // Descartar pide confirmación; cancelar la conserva.
    await tarjeta.getByRole("button", { name: `Descartar «${titulo}»` }).click();
    await tarjeta.getByRole("button", { name: "Cancelar" }).click();
    await expect(tarjeta).toBeVisible();

    await tarjeta.getByRole("button", { name: `Descartar «${titulo}»` }).click();
    await tarjeta.getByRole("button", { name: "Confirmar" }).click();
    await expect(tarjeta).toHaveCount(0);

    // La pieza descartada se conserva y se ve con «Mostrar descartadas».
    await page.getByRole("switch", { name: "Mostrar descartadas" }).click();
    await expect(page.getByRole("article").filter({ hasText: titulo })).toContainText("Descartada");
  });
});

test.describe("CU-20 Generar propuesta de contenido con IA", () => {
  test("RF-119 RF-121 pide una propuesta al modelo falso, edita el borrador y lo guarda como pieza", async ({
    page,
  }) => {
    const titulo = `Pieza con IA E2E ${SUFIJO}`;
    await ingresar(page, DUENA.email, DUENA.password);
    await page.goto("/redes");

    await page.getByRole("button", { name: "Propuesta con IA" }).click();
    const panel = page.getByRole("dialog", { name: "Propuesta con IA" });

    // Sin canal no se genera.
    await panel.getByLabel("Tema o destino").fill("Bariloche en invierno");
    await panel.getByRole("button", { name: "Generar" }).click();
    await expect(panel.getByRole("alert")).toContainText("Elegí un canal");

    // RF-119: la IA falsa devuelve dos borradores.
    await panel.getByRole("button", { name: "Instagram" }).click();
    await panel.getByRole("button", { name: "Generar" }).click();
    await expect(panel.getByRole("heading", { name: "2 borradores para Instagram" })).toBeVisible();
    await expect(panel.getByText("Primer borrador generado por el modelo falso.")).toBeVisible();
    await expect(panel.getByText("Segundo borrador del modelo falso.")).toBeVisible();

    // RF-121: elige el segundo, corrige su texto y lo guarda como pieza nueva.
    await panel.getByRole("radio").nth(1).check();
    await panel.getByRole("button", { name: /^Editar / }).nth(1).click();
    const editado = `Texto corregido a mano ${SUFIJO}`;
    await panel.getByLabel("Texto del borrador").fill(editado);
    await panel.getByLabel("Título").fill(titulo);
    await panel.getByRole("button", { name: "Guardar en la pieza" }).click();
    await expect(panel.getByRole("alert")).toContainText("Elegí la fecha de publicación");
    await panel.getByLabel("Fecha de publicación").fill(hoy());
    await panel.getByRole("button", { name: "Guardar en la pieza" }).click();

    // La pieza queda en Idea, con el canal de la propuesta y el texto editado.
    await expect(panel).toHaveCount(0);
    const tarjeta = page.getByRole("article").filter({ hasText: titulo });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText("Instagram");
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const pagina = await api<{ items: { titulo: string; texto: string; estado_kanban: string }[] }>(
      duena,
      "GET",
      "/contenidos?por_pagina=100",
    );
    const guardada = pagina.items.find((p) => p.titulo === titulo);
    expect(guardada?.texto).toBe(editado);
    expect(guardada?.estado_kanban).toBe("idea");
  });
});

test.describe("DEC-0013 acceso al módulo de redes", () => {
  test("RF-113 un empleado sin acceso a redes no ve la sección y la API lo rechaza", async ({
    page,
  }) => {
    const email = await crearEmpleado("sin", false);
    await ingresar(page, email, CLAVE);

    await expect(page.getByRole("navigation").getByRole("link", { name: "Agenda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Redes" })).toHaveCount(0);

    // Por la URL vuelve a la agenda.
    await page.goto("/redes");
    await expect(page).toHaveURL(/\/agenda$/);

    // Y la API lo rechaza igual si lo intenta por su cuenta.
    const token = await tokenDe(email, CLAVE);
    // El Compose de e2e publica nginx por HTTP en localhost.
    // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
    const respuesta = await fetch(`${URL_BASE}/api/contenidos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(respuesta.status).toBe(403);
  });

  test("RF-113 un empleado con acceso a redes ve la sección", async ({ page }) => {
    const email = await crearEmpleado("con", true);
    await ingresar(page, email, CLAVE);

    await page.getByRole("link", { name: "Redes" }).click();
    await expect(page.getByRole("heading", { name: "Contenido en redes", level: 1 })).toBeVisible();
  });
});
