import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, elegirContrasena, URL_BASE } from "./compose";

// T-108: el circuito completo de CU-01 (de la consulta a la venta) contra el backend real. La
// persona recorre la web de punta a punta; por la API solo se arman los datos de partida (un
// destino con requisitos, un operador) y se leen los resultados que la pantalla no muestra. No
// depende de las semillas de demo ni de los e2e de otros módulos: cada ejecución crea todo con un
// sufijo único, porque la base y el emulador se comparten entre specs.
const SUFIJO = String(Date.now());
const CLAVE_FREELANCE = "Clave-de-prueba-6";

interface Id {
  id: string;
}

interface ViajeApi {
  id: string;
  estado: string;
  moneda: string;
  precio_venta: string;
  costo: string;
  ganancia: string;
  margen: string | null;
  vendedor_id: string | null;
  operador_id: string | null;
  comision_tipo: string;
  comision_vendedor: string;
  saldo_pendiente: string;
}

interface PagoApi {
  tipo: string;
  monto: string;
  vencimiento: string;
  estado: string;
  forma_pago: string | null;
}

interface AlertaApi {
  descripcion: string;
  tipo: string;
  fecha: string;
  estado: string;
}

interface OportunidadApi {
  estado: string;
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

test.describe("CU-01 De la consulta a la venta", () => {
  test("CU-01 de la consulta a la venta: del cliente al viaje confirmado, y el freelance no ve el viaje ajeno", async ({
    page,
    browser,
  }) => {
    test.slow();
    const HOY = hoy();
    const SALIDA = sumarDias(HOY, 120);
    const REGRESO = sumarDias(HOY, 128);
    const nombreCliente = `Cliente CU01 E2E ${SUFIJO}`;
    const nombreDestino = `Destino CU01 ${SUFIJO}`;
    const nombreOperador = `Operador CU01 ${SUFIJO}`;
    const pasaporte = `Pasaporte CU01 ${SUFIJO}`;
    const seguro = `Seguro CU01 ${SUFIJO}`;
    const duena = await tokenDe(DUENA.email, DUENA.password);

    // Datos de partida por la API: un destino con dos requisitos activos (A3) y un operador.
    const destino = await api<Id>(duena, "POST", "/destinos", {
      nombre: nombreDestino,
      pais: "Argentina",
    });
    await api(duena, "POST", `/destinos/${destino.id}/requisitos`, {
      nombre: pasaporte,
      tipo: "documentacion",
      obligatorio: true,
      anticipacion_dias: 30,
    });
    await api(duena, "POST", `/destinos/${destino.id}/requisitos`, {
      nombre: seguro,
      tipo: "seguro",
      obligatorio: false,
      anticipacion_dias: 7,
    });
    const operador = await api<Id>(duena, "POST", "/operadores", {
      nombre: nombreOperador,
      contacto: `operador-cu01-${SUFIJO}@rumbo.test`,
    });

    await ingresar(page, DUENA.email, DUENA.password);

    let oportunidadUrl = "";
    await test.step("RF-001 y RF-010 cliente nuevo y consulta: la oportunidad nace «Nueva» y pasa a «En gestión»", async () => {
      await page.goto("/oportunidades/nueva");
      await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
      await page.getByLabel("Nombre y apellido o grupo").fill(nombreCliente);
      await page.getByLabel("Contacto (teléfono o email)").fill(`cu01-${SUFIJO}@rumbo.test`);
      await page.getByRole("button", { name: "Guardar cliente" }).click();
      await expect(page.getByText(nombreCliente)).toBeVisible();

      await page.getByLabel("Canal").selectOption("whatsapp");
      await page.getByLabel("Destino").fill(nombreDestino);
      await page.getByLabel("Pasajeros").fill("2");
      await page.getByRole("button", { name: "Registrar consulta" }).click();

      await expect(page).toHaveURL(/\/oportunidades\/[0-9a-f-]{36}$/);
      oportunidadUrl = new URL(page.url()).pathname;
      await expect(page.getByRole("heading", { name: nombreDestino, level: 1 })).toBeVisible();
      await expect(page.getByText("Nueva", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Pasar a en gestión" }).click();
      await expect(page.getByText("En gestión", { exact: true })).toBeVisible();
    });

    await test.step("RF-021 cotización: se emite, se envía y la oportunidad pasa a «Cotizada»; el cliente la acepta", async () => {
      await page.getByRole("main").getByRole("link", { name: "Cotizaciones" }).click();
      await expect(page).toHaveURL(new RegExp(`${oportunidadUrl}/cotizaciones$`));

      const formulario = page.getByRole("form", { name: "Nueva cotización" });
      await formulario.getByLabel("Concepto").fill("Aéreo + alojamiento 8 noches");
      await formulario.getByLabel("Precio").fill("1200000");
      await formulario.getByRole("button", { name: "Generar documento" }).click();
      await expect(formulario.getByRole("status")).toContainText("Cotización emitida", {
        timeout: 10_000,
      });

      const version = page
        .getByRole("list", { name: "Versiones de la cotización" })
        .getByRole("listitem")
        .first();
      await version.getByRole("button", { name: "Marcar como enviada" }).click();
      await expect(version).toContainText("Enviada");
      await version.getByRole("button", { name: "Aceptar" }).click();
      await expect(version).toContainText("Aceptada");

      await page.goto(oportunidadUrl);
      // Aceptar no gana la oportunidad: la gana la confirmación de la reserva.
      await expect(page.getByText("Cotizada", { exact: true })).toBeVisible();
    });

    await test.step("RF-032 confirmar la reserva: nace el viaje «Reservado» y la oportunidad queda «Ganada»", async () => {
      await page.getByRole("button", { name: "Confirmar reserva" }).click();
      const dialogo = page.getByRole("dialog", { name: "Confirmar reserva" });
      await dialogo.getByLabel("Destino", { exact: true }).selectOption({ label: `${nombreDestino}, Argentina` });
      await dialogo.getByLabel("Salida", { exact: true }).fill(SALIDA);
      await dialogo.getByLabel("Regreso", { exact: true }).fill(REGRESO);
      await dialogo.getByLabel("Categoría", { exact: true }).selectOption("individual");
      await dialogo.getByLabel("Costo (ARS)").fill("950000");
      await dialogo.getByLabel("Vencimiento del pago").fill(sumarDias(HOY, 30));
      await dialogo.getByRole("button", { name: "Confirmar reserva" }).click();

      await expect(page).toHaveURL(/\/viajes\/[0-9a-f-]{36}$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: nombreDestino, level: 1 })).toBeVisible();
      await expect(page.getByText("Reservado", { exact: true })).toBeVisible();
      await expect(page.getByText(nombreCliente)).toBeVisible();
    });

    const viajeUrl = new URL(page.url()).pathname;
    const viajeId = viajeUrl.split("/").pop() ?? "";

    await test.step("RF-034 y RF-035 alertas de la reserva: una por requisito del destino y la de salida", async () => {
      await page.goto("/agenda");
      await page.getByRole("tab", { name: /Próximas/ }).click();
      const salida = ddmmaa(SALIDA);
      await expect(
        page.getByRole("listitem").filter({ hasText: `${pasaporte}: tramitarlo antes de la salida` }),
      ).toBeVisible();
      await expect(
        page.getByRole("listitem").filter({ hasText: `${seguro}: tramitarlo antes de la salida` }),
      ).toBeVisible();

      // Y por la API: tipo y fecha de cada una (la anticipación sale del requisito).
      const alertas = await api<{ items: AlertaApi[] }>(
        duena,
        "GET",
        "/alertas?proximas=true&por_pagina=100",
      );
      const del = (texto: string) => alertas.items.find((a) => a.descripcion.includes(texto));
      expect(del(pasaporte)?.tipo).toBe("formulario");
      expect(del(pasaporte)?.fecha).toBe(sumarDias(SALIDA, -30));
      expect(del(seguro)?.fecha).toBe(sumarDias(SALIDA, -7));
      const deSalida = del(`El viaje sale el ${salida}.`);
      expect(deSalida?.tipo).toBe("salida");
    });

    await test.step("RF-054 economía: ganancia y margen se calculan y la comisión del vendedor va aparte", async () => {
      await page.goto(viajeUrl);
      const economia = page.getByRole("form", { name: "Economía del viaje" });
      await economia.getByLabel("Costo del operador", { exact: true }).fill("900000");
      await economia.getByLabel("Operador", { exact: true }).selectOption({ label: nombreOperador });
      await economia.getByLabel("Vendedor", { exact: true }).selectOption({ label: DUENA.nombre });
      await economia.getByLabel("Tipo de comisión", { exact: true }).selectOption("porcentaje");
      await economia.getByLabel("Comisión del vendedor", { exact: true }).fill("10");
      await economia.getByRole("button", { name: "Guardar economía" }).click();
      await expect(economia.getByRole("status")).toContainText("Economía guardada");

      const viaje = await api<ViajeApi>(duena, "GET", `/viajes/${viajeId}`);
      expect(Number(viaje.precio_venta)).toBe(1_200_000);
      expect(Number(viaje.costo)).toBe(900_000);
      expect(Number(viaje.ganancia)).toBe(300_000); // venta − costo
      expect(Number(viaje.margen)).toBeCloseTo(0.25, 4); // ganancia / venta
      expect(viaje.operador_id).toBe(operador.id);
      expect(viaje.comision_tipo).toBe("porcentaje");
      expect(Number(viaje.comision_vendedor)).toBe(10);
    });

    await test.step("RF-060 plan de cuotas: seña, cuota y saldo que suman el precio de venta", async () => {
      await page.getByRole("button", { name: "Editar plan" }).click();
      const editor = page.getByRole("form", { name: "Editor del plan de pagos" });
      await editor.getByRole("button", { name: "Agregar seña" }).click();
      await editor.getByRole("button", { name: "Agregar cuota" }).click();

      await editor.getByLabel("Monto de la seña", { exact: true }).fill("400000");
      await editor.getByLabel("Vencimiento de la seña", { exact: true }).fill(sumarDias(HOY, 10));
      await editor.getByLabel("Monto de la cuota 1", { exact: true }).fill("400000");
      await editor
        .getByLabel("Vencimiento de la cuota 1", { exact: true })
        .fill(sumarDias(HOY, 40));
      await editor.getByLabel("Monto del saldo", { exact: true }).fill("400000");
      await editor.getByLabel("Vencimiento del saldo", { exact: true }).fill(sumarDias(HOY, 70));
      await expect(editor.getByText("La suma de los pagos coincide con el precio de venta.")).toBeVisible();
      await editor.getByRole("button", { name: "Guardar plan" }).click();

      const pagos = page.getByRole("list", { name: "Pagos del viaje" }).getByRole("listitem");
      await expect(pagos).toHaveCount(3);
      const plan = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeId}/pagos`);
      expect(plan.map((p) => p.tipo)).toEqual(["sena", "cuota", "saldo"]);
      expect(plan.every((p) => p.estado === "pendiente")).toBe(true);
      expect(plan.reduce((total, p) => total + Number(p.monto), 0)).toBe(1_200_000);

      // Cada pago nuevo trae su alerta de vencimiento (un mes antes).
      // Unas ya vencieron o son de hoy (agenda) y otras son futuras (próximas): se juntan ambas.
      const deAgenda = await api<{ items: AlertaApi[] }>(duena, "GET", "/alertas?tipo=pago&por_pagina=100");
      const proximas = await api<{ items: AlertaApi[] }>(
        duena,
        "GET",
        "/alertas?tipo=pago&proximas=true&por_pagina=100",
      );
      const alertas = { items: [...deAgenda.items, ...proximas.items] };
      const vencimientos = [10, 40, 70].map((dias) => ddmmaa(sumarDias(HOY, dias)));
      for (const vence of vencimientos) {
        expect(
          alertas.items.some((a) => a.descripcion.includes(`vence el ${vence}`)),
          `debería existir la alerta del pago que vence el ${vence}`,
        ).toBe(true);
      }
    });

    await test.step("RF-067 cobros: el primero vende el viaje y al saldar el total queda «Confirmado»", async () => {
      const pagos = page.getByRole("list", { name: "Pagos del viaje" });
      const cobrar = async (fila: string) => {
        await pagos.getByRole("listitem").filter({ hasText: fila }).getByRole("button", { name: "Registrar cobro" }).click();
        const dialogo = page.getByRole("dialog", { name: "Registrar cobro" });
        await dialogo.getByLabel("Fecha efectiva del cobro").fill(HOY);
        await dialogo.getByRole("radio", { name: "Transferencia" }).click();
        await dialogo.getByRole("button", { name: "Registrar cobro" }).click();
        await expect(dialogo).toHaveCount(0);
      };

      await cobrar("Seña");
      await expect(page.getByText("Vendido", { exact: true })).toBeVisible();
      await cobrar("Cuota");
      await expect(page.getByText("Vendido", { exact: true })).toBeVisible();
      await cobrar("Saldo");
      await expect(page.getByText("Confirmado", { exact: true })).toBeVisible();

      const viaje = await api<ViajeApi>(duena, "GET", `/viajes/${viajeId}`);
      expect(viaje.estado).toBe("confirmado");
      expect(Number(viaje.saldo_pendiente)).toBe(0);
      const plan = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeId}/pagos`);
      expect(plan.every((p) => p.estado === "pagado" && p.forma_pago === "transferencia")).toBe(
        true,
      );

      // Y en el listado de la agencia el viaje figura confirmado; la oportunidad quedó ganada.
      await page.goto("/viajes");
      const fila = page.getByRole("row").filter({ hasText: nombreDestino });
      await expect(fila).toContainText("Confirmado");
      const [oportunidad] = (
        await api<{ items: (OportunidadApi & { id: string })[] }>(
          duena,
          "GET",
          `/oportunidades?por_pagina=100`,
        )
      ).items.filter((o) => oportunidadUrl.endsWith(o.id));
      expect(oportunidad?.estado).toBe("ganada");
    });

    await test.step("RF-151 visibilidad: un freelance no ve el viaje de otro vendedor", async () => {
      const email = `freelance-cu01-${SUFIJO}@rumbo.test`;
      await api(duena, "POST", "/usuarios", {
        nombre: `Freelance CU01 E2E ${SUFIJO}`,
        email,
        rol: "freelance",
      });
      // El alta crea la cuenta sin contraseña (DEC-0016): se elige con el código del emulador.
      await elegirContrasena(email, CLAVE_FREELANCE);

      const contexto = await browser.newContext({ baseURL: URL_BASE, locale: "es-AR" });
      try {
        const paginaFreelance = await contexto.newPage();
        await ingresar(paginaFreelance, email, CLAVE_FREELANCE);

        await paginaFreelance.goto("/viajes");
        await expect(
          paginaFreelance.getByText("Estás viendo solo tus viajes", { exact: false }),
        ).toBeVisible();
        await expect(paginaFreelance.getByRole("tab", { name: "Toda la agencia" })).toHaveCount(0);
        await expect(paginaFreelance.getByText(nombreDestino)).toHaveCount(0);

        await paginaFreelance.goto(viajeUrl);
        await expect(
          paginaFreelance.getByText(
            "No encontramos el viaje. Puede que ya no exista o que no lo puedas ver.",
          ),
        ).toBeVisible();
        await expect(paginaFreelance.getByText(nombreDestino)).toHaveCount(0);
        await expect(paginaFreelance.getByText(nombreCliente)).toHaveCount(0);

        await paginaFreelance.goto(oportunidadUrl);
        await expect(
          paginaFreelance.getByText(
            "No pudimos cargar la oportunidad: no existe o no la podés ver.",
          ),
        ).toBeVisible();
      } finally {
        await contexto.close();
      }
    });
  });
});
