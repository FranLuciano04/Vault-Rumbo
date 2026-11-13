import { expect as esperar, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, URL_BASE } from "./compose";

// T-181: el circuito nuevo de la reserva (DEC-0028) contra el backend real: dos cotizaciones con
// hoteles, se gana eligiendo la que NO es la última, la reserva sale precargada y solo con el primer
// pago, y el viaje nace con su itinerario y el plan por completar. La persona recorre la web; por la
// API solo se arman los datos de partida (destino y hoteles) y se leen los resultados. Cada
// ejecución crea todo con un sufijo único: la base y el emulador se comparten entre specs.
// El backend del Compose puede tardar varios segundos por pedido con la máquina cargada: las
// esperas de las pantallas son más generosas que las 5 s por defecto.
const expect = esperar.configure({ timeout: 20_000 });
const SUFIJO = String(Date.now());
const AVISO_PLAN = "Los pagos del plan no suman el precio de venta: rebalanceá el plan de pagos.";

interface Id {
  id: string;
}

interface ViajeApi {
  id: string;
  estado: string;
  moneda: string;
  precio_venta: string;
  saldo_pendiente: string;
}

interface PagoApi {
  tipo: string;
  monto: string;
  estado: string;
}

interface TramoApi {
  hotel_id: string;
  check_in: string;
  check_out: string;
  orden: number;
}

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

async function ingresar(pagina: Page, email: string, password: string): Promise<void> {
  await pagina.goto("/login");
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(password);
  const respuesta = pagina.waitForResponse((r) => r.url().includes("/api/auth/yo"));
  await pagina.getByRole("button", { name: "Ingresar" }).click();
  const yo = await respuesta;
  if (!yo.ok()) throw new Error(`Falló el ingreso de ${email}: ${String(yo.status())}`);
  await expect(pagina).toHaveURL(/\/agenda$/);
}

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

/** Un destino con sus hoteles abiertos en el catálogo, por la API. */
async function destinoConHoteles(
  token: string,
  nombreDestino: string,
  nombresHoteles: string[],
): Promise<{ destinoId: string; hoteles: string[] }> {
  const destino = await api<Id>(token, "POST", "/destinos", {
    nombre: nombreDestino,
    pais: "Argentina",
  });
  const hoteles: string[] = [];
  for (const nombre of nombresHoteles) {
    const hotel = await api<Id>(token, "POST", "/hoteles", {
      nombre,
      destino_id: destino.id,
      categoria: "4 estrellas",
      precio_referencia: "100000.00",
      servicios: ["wifi"],
    });
    hoteles.push(hotel.id);
  }
  return { destinoId: destino.id, hoteles };
}

/** Cliente nuevo y consulta con fechas tentativas; termina en el detalle de la oportunidad. */
async function consultar(
  page: Page,
  cliente: string,
  destino: string,
  desde: string,
  hasta: string,
): Promise<string> {
  await page.goto("/oportunidades/nueva");
  await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
  await page.getByLabel("Nombre y apellido o grupo").fill(cliente);
  await page
    .getByLabel("Contacto (teléfono o email)")
    .fill(`${cliente.toLowerCase().replaceAll(" ", "-")}@rumbo.test`);
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByText(cliente)).toBeVisible();
  await page.getByLabel("Canal").selectOption("whatsapp");
  await page.getByLabel("Destino").fill(destino);
  await page.getByLabel("Pasajeros").fill("2");
  await page.getByLabel("Fecha desde").fill(desde);
  await page.getByLabel("Fecha hasta").fill(hasta);
  await page.getByRole("button", { name: "Registrar consulta" }).click();
  await expect(page).toHaveURL(/\/oportunidades\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}

async function cobrar(page: Page, fila: string, fecha: string): Promise<void> {
  await page
    .getByRole("list", { name: "Pagos del viaje" })
    .getByRole("listitem")
    .filter({ hasText: fila })
    .getByRole("button", { name: "Registrar cobro" })
    .click();
  const dialogo = page.getByRole("dialog", { name: "Registrar cobro" });
  await dialogo.getByLabel("Fecha efectiva del cobro").fill(fecha);
  await dialogo.getByRole("radio", { name: "Transferencia" }).click();
  await dialogo.getByRole("button", { name: "Registrar cobro" }).click();
  await expect(dialogo).toHaveCount(0);
}

test.describe("CU-01 Reserva desde la cotización elegida", () => {
  test("RF-024 RF-032 RF-033 RF-106 la cotización elegida (no la última) arma la reserva con su moneda, su precio, sus hoteles y solo el primer pago; completar el plan y cobrar todo confirma el viaje", async ({
    page,
  }) => {
    test.slow();
    const HOY = hoy();
    const SALIDA = sumarDias(HOY, 120);
    const CORTE = sumarDias(HOY, 124);
    const REGRESO = sumarDias(HOY, 128);
    const nombreCliente = `Cliente Reserva E2E ${SUFIJO}`;
    const nombreDestino = `Destino Reserva ${SUFIJO}`;
    const alfa = `Hotel Alfa Reserva ${SUFIJO}`;
    const beta = `Hotel Beta Reserva ${SUFIJO}`;
    const gamma = `Hotel Gamma Reserva ${SUFIJO}`;
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const { destinoId, hoteles } = await destinoConHoteles(duena, nombreDestino, [
      alfa,
      beta,
      gamma,
    ]);

    await ingresar(page, DUENA.email, DUENA.password);
    const oportunidadUrl = await consultar(page, nombreCliente, nombreDestino, SALIDA, REGRESO);

    await test.step("RF-021 RF-106 se emiten dos cotizaciones con hoteles: la 1 en USD con dos hoteles y la 2 en ARS", async () => {
      await page.getByRole("main").getByRole("link", { name: "Cotizaciones" }).click();
      await expect(page).toHaveURL(new RegExp(`${oportunidadUrl}/cotizaciones$`));
      const formulario = page.getByRole("form", { name: "Nueva cotización" });
      const lista = page
        .getByRole("list", { name: "Cotizaciones de la oportunidad" })
        .getByRole("listitem");

      // Cotización 1 (USD): Alfa del inicio al corte y Beta del corte al regreso.
      await formulario.getByRole("radio", { name: "USD" }).check();
      await formulario.getByRole("button", { name: "Buscar hoteles" }).click();
      await formulario.getByRole("button", { name: `Agregar ${alfa}` }).click();
      await formulario.getByRole("button", { name: `Agregar ${beta}` }).click();
      // Los hoteles arrancan con las fechas tentativas de la oportunidad.
      await expect(formulario.getByLabel(`Check-in de ${alfa}`, { exact: true })).toHaveValue(
        SALIDA,
      );
      await expect(formulario.getByLabel(`Check-out de ${beta}`, { exact: true })).toHaveValue(
        REGRESO,
      );
      await formulario.getByLabel("Precio", { exact: true }).nth(0).fill("900");
      await formulario.getByLabel("Precio", { exact: true }).nth(1).fill("600");
      await formulario.getByLabel(`Check-out de ${alfa}`, { exact: true }).fill(CORTE);
      await formulario.getByLabel(`Check-in de ${beta}`, { exact: true }).fill(CORTE);
      await formulario.getByRole("button", { name: "Generar documento" }).click();
      await expect(lista).toHaveCount(1);

      // Cotización 2 (ARS), la última: Gamma durante todo el viaje.
      await formulario.getByRole("radio", { name: "ARS" }).check();
      await formulario.getByRole("button", { name: `Agregar ${gamma}` }).click();
      await formulario.getByLabel("Precio", { exact: true }).nth(0).fill("2000000");
      await formulario.getByRole("button", { name: "Generar documento" }).click();
      await expect(lista).toHaveCount(2);

      // Las dos se envían: la más reciente queda arriba.
      for (const posicion of [0, 1]) {
        const alternativa = lista.nth(posicion);
        await alternativa.getByRole("button", { name: "Marcar como enviada" }).click();
        await expect(alternativa).toContainText("Enviada");
      }
      await expect(lista.nth(0)).toContainText("Cotización 2");
      await expect(lista.nth(1)).toContainText("Cotización 1");
      await expect(lista.nth(1)).toContainText(alfa);
    });

    let viajeUrl = "";
    await test.step("RF-016 RF-024 se gana la oportunidad con la cotización 1 (no la última) y la reserva sale precargada", async () => {
      await page.goto(oportunidadUrl);
      await page.getByRole("button", { name: "Ganar" }).click();
      const ganar = page.getByRole("group", { name: "Ganar la oportunidad" });
      await expect(
        ganar.getByRole("radio", { name: /Sin cotización \(venta directa\)/ }),
      ).toBeVisible();
      await expect(ganar.getByRole("radio")).toHaveCount(3);
      await ganar.getByRole("radio", { name: new RegExp(`${alfa}.*${beta}`) }).check();
      await ganar.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect(page.getByText("Ganada", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Confirmar reserva" }).click();
      const dialogo = page.getByRole("dialog", { name: "Confirmar reserva" });
      // Todo viene de la cotización elegida y de la oportunidad.
      await expect(dialogo.getByLabel("Destino", { exact: true })).toHaveValue(destinoId);
      await expect(dialogo.getByLabel("Salida", { exact: true })).toHaveValue(SALIDA);
      await expect(dialogo.getByLabel("Regreso", { exact: true })).toHaveValue(REGRESO);
      await expect(dialogo.getByLabel("Precio de venta (USD)")).toHaveValue(/^1500(\.0+)?$/);
      await expect(
        dialogo.getByText("El resto del plan de pagos se completa desde el viaje."),
      ).toBeVisible();

      await dialogo.getByLabel("Categoría", { exact: true }).selectOption("individual");
      await dialogo.getByLabel("Costo (USD)").fill("1000");
      await dialogo.getByLabel("Monto del primer pago").fill("500");
      await dialogo.getByLabel("Tipo de pago", { exact: true }).selectOption("sena");
      await dialogo.getByLabel("Vencimiento del pago").fill(sumarDias(HOY, 10));
      await dialogo.getByRole("button", { name: "Confirmar reserva" }).click();

      await expect(page).toHaveURL(/\/viajes\/[0-9a-f-]{36}$/);
      viajeUrl = new URL(page.url()).pathname;
      await expect(page.getByText("Reservado", { exact: true })).toBeVisible();
    });

    const viajeId = viajeUrl.split("/").pop() ?? "";

    await test.step("RF-032 RF-106 el viaje tiene la moneda y el precio de la cotización 1, sus tramos y un solo pago con el aviso del plan", async () => {
      const viaje = await api<ViajeApi>(duena, "GET", `/viajes/${viajeId}`);
      expect(viaje.moneda).toBe("USD");
      expect(Number(viaje.precio_venta)).toBe(1500);

      const tramos = await api<TramoApi[]>(duena, "GET", `/viajes/${viajeId}/itinerario`);
      const ordenados = [...tramos].sort((a, b) => a.orden - b.orden);
      expect(ordenados.map((t) => t.hotel_id)).toEqual([hoteles[0], hoteles[1]]);
      expect(ordenados.map((t) => [t.check_in, t.check_out])).toEqual([
        [SALIDA, CORTE],
        [CORTE, REGRESO],
      ]);
      const tarjetas = page
        .getByRole("list", { name: "Tramos del itinerario" })
        .getByRole("listitem");
      await expect(tarjetas).toHaveCount(2);
      await expect(tarjetas.nth(0)).toContainText(alfa);
      await expect(tarjetas.nth(1)).toContainText(beta);

      const pagos = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeId}/pagos`);
      expect(pagos).toHaveLength(1);
      expect(pagos[0]?.tipo).toBe("sena");
      expect(Number(pagos[0]?.monto)).toBe(500);
      await expect(
        page.getByRole("list", { name: "Pagos del viaje" }).getByRole("listitem"),
      ).toHaveCount(1);
      await expect(page.getByRole("alert").filter({ hasText: AVISO_PLAN }).first()).toBeVisible();
    });

    await test.step("RF-060 RF-067 se completa el plan desde el viaje y, cobrado todo, el viaje queda «Confirmado»", async () => {
      await page.getByRole("button", { name: "Editar plan" }).click();
      const editor = page.getByRole("form", { name: "Editor del plan de pagos" });
      await editor.getByRole("button", { name: "Agregar saldo" }).click();
      await editor.getByLabel("Monto del saldo", { exact: true }).fill("1000");
      await editor.getByLabel("Vencimiento del saldo", { exact: true }).fill(sumarDias(HOY, 40));
      await expect(
        editor.getByText("La suma de los pagos coincide con el precio de venta."),
      ).toBeVisible();
      await editor.getByRole("button", { name: "Guardar plan" }).click();
      await expect(
        page.getByRole("list", { name: "Pagos del viaje" }).getByRole("listitem"),
      ).toHaveCount(2);
      await expect(page.getByRole("alert").filter({ hasText: AVISO_PLAN })).toHaveCount(0);

      await cobrar(page, "Seña", HOY);
      await expect(page.getByText("Vendido", { exact: true })).toBeVisible();
      await cobrar(page, "Saldo", HOY);
      await expect(page.getByText("Confirmado", { exact: true })).toBeVisible();

      const viaje = await api<ViajeApi>(duena, "GET", `/viajes/${viajeId}`);
      expect(viaje.estado).toBe("confirmado");
      expect(Number(viaje.saldo_pendiente)).toBe(0);
    });
  });

  test("RF-016 RF-032 la venta directa (ganar sin cotización) sigue funcionando y el viaje nace sin itinerario", async ({
    page,
  }) => {
    test.slow();
    const HOY = hoy();
    const SALIDA = sumarDias(HOY, 150);
    const REGRESO = sumarDias(HOY, 157);
    const nombreCliente = `Cliente Directa E2E ${SUFIJO}`;
    const nombreDestino = `Destino Directa ${SUFIJO}`;
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const { destinoId } = await destinoConHoteles(duena, nombreDestino, []);

    await ingresar(page, DUENA.email, DUENA.password);
    await consultar(page, nombreCliente, nombreDestino, SALIDA, REGRESO);

    await page.getByRole("button", { name: "Ganar" }).click();
    const ganar = page.getByRole("group", { name: "Ganar la oportunidad" });
    await expect(ganar.getByRole("radio")).toHaveCount(1);
    await expect(
      ganar.getByRole("radio", { name: /Sin cotización \(venta directa\)/ }),
    ).toBeChecked();
    await ganar.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByText("Ganada", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Confirmar reserva" }).click();
    const dialogo = page.getByRole("dialog", { name: "Confirmar reserva" });
    await expect(dialogo.getByLabel("Destino", { exact: true })).toHaveValue(destinoId);
    await dialogo.getByLabel("Categoría", { exact: true }).selectOption("individual");
    await dialogo.getByLabel("Moneda", { exact: true }).selectOption("ARS");
    await dialogo.getByLabel("Precio de venta (ARS)").fill("1000000");
    await dialogo.getByLabel("Costo (ARS)").fill("800000");
    await dialogo.getByLabel("Monto del primer pago").fill("300000");
    await dialogo.getByLabel("Tipo de pago", { exact: true }).selectOption("sena");
    await dialogo.getByLabel("Vencimiento del pago").fill(sumarDias(HOY, 10));
    await dialogo.getByRole("button", { name: "Confirmar reserva" }).click();

    await expect(page).toHaveURL(/\/viajes\/[0-9a-f-]{36}$/);
    const viajeId = new URL(page.url()).pathname.split("/").pop() ?? "";
    await expect(page.getByText("Reservado", { exact: true })).toBeVisible();
    await expect(page.getByText("Todavía no hay hoteles en el itinerario.")).toBeVisible();

    const viaje = await api<ViajeApi>(duena, "GET", `/viajes/${viajeId}`);
    expect(viaje.moneda).toBe("ARS");
    expect(Number(viaje.precio_venta)).toBe(1_000_000);
    expect(await api<TramoApi[]>(duena, "GET", `/viajes/${viajeId}/itinerario`)).toHaveLength(0);
  });
});
