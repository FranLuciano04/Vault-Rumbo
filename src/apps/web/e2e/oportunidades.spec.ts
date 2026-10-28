import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, elegirContrasena, URL_BASE } from "./compose";

// T-074: el embudo comercial (CU-04, CU-05, CU-06) contra el backend real. Los datos de partida
// se preparan por la API; lo que se prueba se hace desde la web. Cada test crea su propio
// cliente y su propia oportunidad con un sufijo único: la base y el emulador se comparten entre
// specs. No depende de la semilla de demo de oportunidades: crea sus propios datos.
const SUFIJO = String(Date.now());
const CLAVE_FREELANCE = "Clave-de-prueba-5";

interface ClienteApi {
  id: string;
  nombre: string;
}

interface OportunidadApi {
  id: string;
  estado: string;
}

interface CotizacionApi {
  id: string;
  estado: string;
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

/** Cliente + oportunidad de la dueña, ya en el estado de partida pedido. */
async function prepararOportunidad(
  token: string,
  etiqueta: string,
  { enGestion = true }: { enGestion?: boolean } = {},
): Promise<{ destino: string; oportunidad: OportunidadApi }> {
  const destino = `Destino ${etiqueta} ${SUFIJO}`;
  const cliente = await api<ClienteApi>(token, "POST", "/clientes", {
    nombre: `Cliente ${etiqueta} E2E ${SUFIJO}`,
    contacto: `${etiqueta.toLowerCase()}-${SUFIJO}@rumbo.test`,
    segmento: "pareja",
  });
  let oportunidad = await api<OportunidadApi>(token, "POST", "/oportunidades", {
    cliente_id: cliente.id,
    canal: "whatsapp",
    destino_consultado: destino,
    pasajeros: 2,
  });
  if (enGestion) {
    oportunidad = await api<OportunidadApi>(
      token,
      "POST",
      `/oportunidades/${oportunidad.id}/en-gestion`,
    );
  }
  return { destino, oportunidad };
}

async function cotizacionEnviada(token: string, oportunidadId: string): Promise<CotizacionApi> {
  const cotizacion = await api<CotizacionApi>(
    token,
    "POST",
    `/oportunidades/${oportunidadId}/cotizaciones`,
    { moneda: "ARS", items: [{ concepto: "Paquete completo", precio: "500000.00" }] },
  );
  return api<CotizacionApi>(token, "POST", `/cotizaciones/${cotizacion.id}/enviar`);
}

test.describe("CU-04 Registrar consulta", () => {
  test("RF-010 consulta: cliente nuevo en el momento, la oportunidad nace «Nueva» y pasa a «En gestión»", async ({
    page,
  }) => {
    const nombre = `Cliente Consulta E2E ${SUFIJO}`;
    const destino = `Destino Consulta ${SUFIJO}`;
    await ingresar(page, DUENA.email, DUENA.password);

    await page.goto("/oportunidades/nueva");
    // CU-04 A1: alta rápida del cliente dentro de la consulta.
    await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
    await page.getByLabel("Nombre y apellido o grupo").fill(nombre);
    await page.getByLabel("Contacto (teléfono o email)").fill(`consulta-${SUFIJO}@rumbo.test`);
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(page.getByText(nombre)).toBeVisible();

    await page.getByLabel("Canal").selectOption("instagram");
    await page.getByLabel("Destino").fill(destino);
    await page.getByLabel("Pasajeros").fill("3");
    await page.getByRole("button", { name: "Registrar consulta" }).click();

    // Abre el detalle de la oportunidad recién creada, en estado «Nueva».
    await expect(page).toHaveURL(/\/oportunidades\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: destino, level: 1 })).toBeVisible();
    await expect(page.getByText(nombre)).toBeVisible();
    await expect(page.getByText("3 pasajeros")).toBeVisible();
    await expect(page.getByText("Nueva", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Pasar a en gestión" }).click();
    await expect(page.getByText("En gestión", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pasar a en gestión" })).toHaveCount(0);

    // Y aparece en el embudo.
    await page.goto("/oportunidades");
    await expect(page.getByRole("link", { name: new RegExp(destino) })).toBeVisible();
  });
});

test.describe("CU-06 Emitir cotización", () => {
  test("RF-021 cotización: se emite, se descarga el PDF y al marcarla enviada la oportunidad pasa a «Cotizada»", async ({
    page,
  }) => {
    test.slow();
    const token = await tokenDe(DUENA.email, DUENA.password);
    const { oportunidad } = await prepararOportunidad(token, "Cotizar");
    await ingresar(page, DUENA.email, DUENA.password);

    await page.goto(`/oportunidades/${oportunidad.id}`);
    await page.getByRole("main").getByRole("link", { name: "Cotizaciones" }).click();
    await expect(page).toHaveURL(new RegExp(`/oportunidades/${oportunidad.id}/cotizaciones$`));

    const formulario = page.getByRole("form", { name: "Nueva cotización" });
    await formulario.getByLabel("Concepto").fill("Aéreo + alojamiento 7 noches");
    await formulario.getByLabel("Precio").fill("1200000");
    await formulario.getByRole("button", { name: "Generar documento" }).click();
    await expect(formulario.getByRole("status")).toContainText("Cotización emitida", {
      timeout: 10_000,
    });

    const versiones = page.getByRole("list", { name: "Versiones de la cotización" });
    const version = versiones.getByRole("listitem").first();
    await expect(version).toContainText("Versión 1");
    await expect(version).toContainText("Borrador");

    // El PDF se descarga y es un PDF de verdad (en Windows nativo WeasyPrint puede no cargar).
    const descarga = page.waitForEvent("download");
    await version.getByRole("button", { name: "Descargar PDF" }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toMatch(/^cotizacion-.*\.pdf$/);
    const ruta = await archivo.path();
    const contenido = await readFile(ruta);
    expect(contenido.subarray(0, 4).toString("latin1")).toBe("%PDF");

    await version.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(version).toContainText("Enviada");

    await page.goto(`/oportunidades/${oportunidad.id}`);
    await expect(page.getByText("Cotizada", { exact: true })).toBeVisible();
  });

  test("RF-025 aceptación: la cotización enviada queda «Aceptada» y la oportunidad sigue «Cotizada»", async ({
    page,
  }) => {
    const token = await tokenDe(DUENA.email, DUENA.password);
    const { oportunidad } = await prepararOportunidad(token, "Aceptar");
    await cotizacionEnviada(token, oportunidad.id);
    await ingresar(page, DUENA.email, DUENA.password);

    await page.goto(`/oportunidades/${oportunidad.id}/cotizaciones`);
    const version = page
      .getByRole("list", { name: "Versiones de la cotización" })
      .getByRole("listitem")
      .first();
    await expect(version).toContainText("Enviada");
    await version.getByRole("button", { name: "Aceptar" }).click();
    await expect(version).toContainText("Aceptada");
    await expect(version.getByRole("button", { name: "Aceptar" })).toHaveCount(0);

    await page.goto(`/oportunidades/${oportunidad.id}`);
    // La oportunidad no se gana al aceptar: la gana la confirmación de la reserva (CU-07).
    await expect(page.getByText("Cotizada", { exact: true })).toBeVisible();
  });
});

test.describe("CU-05 Seguir oportunidad", () => {
  test("RF-017 perder: pide un motivo y la oportunidad queda «Perdida» con su motivo", async ({
    page,
  }) => {
    const token = await tokenDe(DUENA.email, DUENA.password);
    const { destino, oportunidad } = await prepararOportunidad(token, "Perder");
    await ingresar(page, DUENA.email, DUENA.password);

    await page.goto(`/oportunidades/${oportunidad.id}`);
    await page.getByRole("button", { name: "Perder", exact: true }).click();
    const formulario = page.getByRole("form", { name: "Perder la oportunidad" });

    // Sin motivo no se confirma.
    await formulario.getByRole("button", { name: "Confirmar" }).click();
    await expect(formulario).toBeVisible();
    await expect(page.getByText("Perdida", { exact: true })).toHaveCount(0);

    await formulario.getByLabel("Motivo").selectOption("precio");
    await formulario.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByText("Perdida", { exact: true })).toBeVisible();
    await expect(page.getByText("Motivo: Precio")).toBeVisible();

    // En el embudo, la tarjeta queda en «Perdida» con el motivo.
    await page.goto("/oportunidades");
    const tarjeta = page.getByRole("link", { name: new RegExp(destino) });
    await expect(tarjeta).toContainText("Motivo: Precio");
  });

  test("RF-020 reactivar: una oportunidad perdida vuelve a «En gestión» y se limpia el motivo", async ({
    page,
  }) => {
    const token = await tokenDe(DUENA.email, DUENA.password);
    const { oportunidad } = await prepararOportunidad(token, "Reactivar");
    await api(token, "POST", `/oportunidades/${oportunidad.id}/perder`, {
      motivo_perdida: "desistio",
    });
    await ingresar(page, DUENA.email, DUENA.password);

    await page.goto(`/oportunidades/${oportunidad.id}`);
    await expect(page.getByText("Perdida", { exact: true })).toBeVisible();
    await expect(page.getByText("Motivo: Desistió")).toBeVisible();

    await page.getByRole("button", { name: "Reactivar" }).click();

    await expect(page.getByText("En gestión", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Motivo:/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reactivar" })).toHaveCount(0);
  });

  test("RF-151 visibilidad del freelance: el embudo trae solo sus oportunidades y la ajena no se abre", async ({
    page,
  }) => {
    const email = `freelance-oport-${SUFIJO}@rumbo.test`;
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const freelance = await api<{ id: string }>(duena, "POST", "/usuarios", {
      nombre: `Freelance Oport E2E ${SUFIJO}`,
      email,
      rol: "freelance",
    });
    // El alta crea la cuenta sin contraseña (DEC-0016): se elige con el código del emulador.
    await elegirContrasena(email, CLAVE_FREELANCE);

    const ajena = await prepararOportunidad(duena, "Ajena");
    const destinoPropio = `Destino Propia ${SUFIJO}`;
    const clientePropio = await api<ClienteApi>(duena, "POST", "/clientes", {
      nombre: `Cliente Propia E2E ${SUFIJO}`,
      contacto: `propia-${SUFIJO}@rumbo.test`,
      segmento: "familia",
      asesor_asignado_id: freelance.id,
    });
    const tokenFreelance = await tokenDe(email, CLAVE_FREELANCE);
    const propia = await api<OportunidadApi>(tokenFreelance, "POST", "/oportunidades", {
      cliente_id: clientePropio.id,
      canal: "presencial",
      destino_consultado: destinoPropio,
      pasajeros: 1,
    });

    await ingresar(page, email, CLAVE_FREELANCE);
    await page.goto("/oportunidades");
    await expect(page.getByRole("link", { name: new RegExp(destinoPropio) })).toBeVisible();
    await expect(page.getByText(ajena.destino)).toHaveCount(0);
    // No ve la vista de toda la agencia.
    await expect(page.getByRole("tab", { name: "Toda la agencia" })).toHaveCount(0);

    await page.goto(`/oportunidades/${propia.id}`);
    await expect(page.getByRole("heading", { name: destinoPropio, level: 1 })).toBeVisible();
    await page.goto(`/oportunidades/${ajena.oportunidad.id}`);
    await expect(
      page.getByText("No pudimos cargar la oportunidad: no existe o no la podés ver."),
    ).toBeVisible();
    await expect(page.getByText(ajena.destino)).toHaveCount(0);
  });
});
