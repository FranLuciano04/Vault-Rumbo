import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, URL_BASE } from "./compose";

// T-109: los flujos alternativos del viaje (CU-11, CU-12 y CU-27) contra el backend real. Cada test
// arma su propio viaje por la API (cliente, oportunidad, cotización aceptada y reserva con su plan
// de pagos), hace la excepción desde la web y lee el resultado por la API atado a los ids de ese
// viaje y de esos pagos. No depende de las semillas de demo: la base y el emulador se comparten
// entre specs, así que todo lleva un sufijo único.
const SUFIJO = String(Date.now());

interface Id {
  id: string;
}

interface ViajeApi {
  id: string;
  estado: string;
  estado_previo: string | null;
  motivo_cancelacion: string | null;
  precio_venta: string;
  saldo_pendiente: string;
}

interface PagoApi {
  id: string;
  tipo: string;
  monto: string;
  vencimiento: string;
  estado: string;
  forma_pago: string | null;
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

async function llamar(
  token: string,
  metodo: string,
  ruta: string,
  cuerpo?: object,
): Promise<Response> {
  // El Compose de e2e publica nginx por HTTP en localhost.
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  return fetch(`${URL_BASE}/api${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
}

async function api<T>(token: string, metodo: string, ruta: string, cuerpo?: object): Promise<T> {
  const respuesta = await llamar(token, metodo, ruta, cuerpo);
  expect(respuesta.ok, `${metodo} ${ruta} respondió ${String(respuesta.status)}`).toBe(true);
  return (await respuesta.json()) as T;
}

interface PagoPlan {
  tipo: "sena" | "cuota" | "saldo";
  monto: string;
  dias: number;
}

/**
 * Viaje «Reservado» armado por la API: cliente, oportunidad, cotización aceptada por `precio` y
 * confirmación de la reserva con el plan dado (la suma del plan tiene que ser el precio).
 */
async function armarViaje(
  token: string,
  etiqueta: string,
  precio: string,
  plan: PagoPlan[],
): Promise<{ viajeId: string; nombreDestino: string; pagos: PagoApi[] }> {
  const nombreDestino = `Destino ${etiqueta} ${SUFIJO}`;
  const destino = await api<Id>(token, "POST", "/destinos", {
    nombre: nombreDestino,
    pais: "Argentina",
  });
  const cliente = await api<Id>(token, "POST", "/clientes", {
    nombre: `Cliente ${etiqueta} E2E ${SUFIJO}`,
    contacto: `${etiqueta.toLowerCase()}-${SUFIJO}@rumbo.test`,
    segmento: "pareja",
  });
  const oportunidad = await api<Id>(token, "POST", "/oportunidades", {
    cliente_id: cliente.id,
    canal: "whatsapp",
    destino_consultado: nombreDestino,
    pasajeros: 2,
  });
  await api(token, "POST", `/oportunidades/${oportunidad.id}/en-gestion`);
  const cotizacion = await api<Id>(token, "POST", `/oportunidades/${oportunidad.id}/cotizaciones`, {
    moneda: "ARS",
    items: [{ concepto: "Paquete completo", precio }],
  });
  await api(token, "POST", `/cotizaciones/${cotizacion.id}/enviar`);
  await api(token, "POST", `/cotizaciones/${cotizacion.id}/aceptar`);

  const HOY = hoy();
  const viaje = await api<Id>(token, "POST", `/oportunidades/${oportunidad.id}/confirmar-reserva`, {
    destino_id: destino.id,
    fecha_salida: sumarDias(HOY, 120),
    fecha_regreso: sumarDias(HOY, 128),
    categoria: "individual",
    economia: { precio_venta: precio, costo: "1000.00" },
    plan_de_pagos: {
      pagos: plan.map((p) => ({
        tipo: p.tipo,
        monto: p.monto,
        vencimiento: sumarDias(HOY, p.dias),
      })),
    },
  });
  const pagos = await pagosDe(token, viaje.id);
  expect(pagos, "la reserva debería crear el plan pedido").toHaveLength(plan.length);
  return { viajeId: viaje.id, nombreDestino, pagos };
}

async function pagosDe(token: string, viajeId: string): Promise<PagoApi[]> {
  return api<PagoApi[]>(token, "GET", `/viajes/${viajeId}/pagos`);
}

const viajeDe = (token: string, viajeId: string) =>
  api<ViajeApi>(token, "GET", `/viajes/${viajeId}`);

/** Cobra un pago por la API (el cobro por la web ya lo recorre cu01.spec.ts). */
async function cobrar(token: string, pagoId: string): Promise<void> {
  await api(token, "POST", `/pagos/${pagoId}/cobrar`, {
    fecha_cobro: hoy(),
    forma_pago: "transferencia",
    moneda_pago: "ARS",
  });
}

const suma = (pagos: PagoApi[]) =>
  pagos.filter((p) => p.estado !== "anulado").reduce((total, p) => total + Number(p.monto), 0);

function fila(pagina: Page, texto: string) {
  return pagina
    .getByRole("list", { name: "Pagos del viaje" })
    .getByRole("listitem")
    .filter({ hasText: texto });
}

test.describe("Excepciones del viaje (CU-11, CU-12, CU-27)", () => {
  test("CU-11 reprogramar, dividir y anular pagos mantiene el plan cuadrado", async ({ page }) => {
    test.slow();
    const HOY = hoy();
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const { viajeId, pagos: inicial } = await armarViaje(duena, "Plan", "900000.00", [
      { tipo: "sena", monto: "300000.00", dias: 10 },
      { tipo: "cuota", monto: "300000.00", dias: 40 },
      { tipo: "saldo", monto: "300000.00", dias: 70 },
    ]);
    const cuota = inicial.find((p) => p.tipo === "cuota") as PagoApi;
    const saldo = inicial.find((p) => p.tipo === "saldo") as PagoApi;

    await ingresar(page, DUENA.email, DUENA.password);
    await page.goto(`/viajes/${viajeId}`);

    await test.step("RF-065 reprogramar un pago no cobrado: cambia el vencimiento y el plan sigue sumando el precio", async () => {
      const nuevo = sumarDias(HOY, 55);
      await fila(page, "Cuota").getByRole("button", { name: "Reprogramar" }).click();
      const panel = page.getByRole("form", { name: /^Reprogramar la cuota/ });
      await panel.getByLabel("Nuevo vencimiento").fill(nuevo);
      await panel.getByRole("button", { name: "Confirmar" }).click();
      await expect(panel).toHaveCount(0);

      const pagos = await pagosDe(duena, viajeId);
      const reprogramada = pagos.find((p) => p.id === cuota.id);
      expect(reprogramada?.vencimiento).toBe(nuevo);
      expect(reprogramada?.estado).toBe("pendiente");
      expect(Number(reprogramada?.monto)).toBe(300_000);
      expect(suma(pagos)).toBe(900_000);
    });

    await test.step("RF-072 dividir un pago en dos: el resto queda en un pago nuevo y la suma no cambia", async () => {
      const vencimientoResto = sumarDias(HOY, 90);
      await fila(page, "Saldo").getByRole("button", { name: "Dividir" }).click();
      const panel = page.getByRole("form", { name: /^Dividir el saldo/ });
      await panel.getByLabel("Monto de ahora").fill("100000");
      await panel.getByLabel("Vencimiento del resto").fill(vencimientoResto);
      await panel.getByRole("button", { name: "Confirmar" }).click();
      await expect(panel).toHaveCount(0);

      const pagos = await pagosDe(duena, viajeId);
      expect(pagos).toHaveLength(4);
      expect(Number(pagos.find((p) => p.id === saldo.id)?.monto)).toBe(100_000);
      const resto = pagos.find((p) => !inicial.some((i) => i.id === p.id));
      expect(Number(resto?.monto)).toBe(200_000);
      expect(resto?.vencimiento).toBe(vencimientoResto);
      expect(suma(pagos)).toBe(900_000);
    });

    await test.step("RF-066 anular un pago: queda «anulado» (baja lógica) y el plan vuelve a exigir la igualdad", async () => {
      await fila(page, "Cuota").getByRole("button", { name: "Anular" }).click();
      const panel = page.getByRole("form", { name: /^¿Anular la cuota/ });
      await panel.getByRole("button", { name: "Confirmar" }).click();
      await expect(panel).toHaveCount(0);

      const pagos = await pagosDe(duena, viajeId);
      // El plan que lista la API no incluye los anulados (baja lógica: el registro se conserva).
      expect(pagos.find((p) => p.id === cuota.id)).toBeUndefined();
      expect(pagos).toHaveLength(3);
      expect(suma(pagos)).toBe(600_000);
      expect(Number((await viajeDe(duena, viajeId)).precio_venta)).toBe(900_000);
      await expect(
        page.getByText("El precio de venta cambió y los pagos ya no lo suman: rebalanceá el plan de pagos."),
      ).toBeVisible();
    });
  });

  test("CU-12 revertir un cobro hace retroceder el viaje", async ({ page }) => {
    test.slow();
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const { viajeId, pagos } = await armarViaje(duena, "Revertir", "600000.00", [
      { tipo: "sena", monto: "200000.00", dias: 10 },
      { tipo: "saldo", monto: "400000.00", dias: 40 },
    ]);
    const sena = pagos.find((p) => p.tipo === "sena") as PagoApi;
    const saldo = pagos.find((p) => p.tipo === "saldo") as PagoApi;

    await cobrar(duena, sena.id);
    await cobrar(duena, saldo.id);
    expect((await viajeDe(duena, viajeId)).estado).toBe("confirmado");

    await ingresar(page, DUENA.email, DUENA.password);
    await page.goto(`/viajes/${viajeId}`);

    const revertir = async (texto: string) => {
      await fila(page, texto).getByRole("button", { name: "Revertir cobro" }).click();
      const panel = page.getByRole("form", { name: /^¿Revertir el cobro de/ });
      await panel.getByRole("button", { name: "Confirmar" }).click();
      await expect(panel).toHaveCount(0);
    };

    await test.step("RF-070 revertir el cobro que saldó el viaje: el pago vuelve a «pendiente» y el viaje de «confirmado» a «vendido»", async () => {
      await revertir("Saldo");
      const viaje = await viajeDe(duena, viajeId);
      expect(viaje.estado).toBe("vendido");
      expect(Number(viaje.saldo_pendiente)).toBe(400_000);
      const actual = await pagosDe(duena, viajeId);
      expect(actual.find((p) => p.id === saldo.id)?.estado).toBe("pendiente");
      expect(actual.find((p) => p.id === sena.id)?.estado).toBe("pagado");
      await expect(page.getByText("Vendido", { exact: true })).toBeVisible();
    });

    await test.step("RF-070 revertir el único cobro que queda: el viaje de «vendido» vuelve a «reservado»", async () => {
      await revertir("Seña");
      const viaje = await viajeDe(duena, viajeId);
      expect(viaje.estado).toBe("reservado");
      expect(Number(viaje.saldo_pendiente)).toBe(600_000);
      const actual = await pagosDe(duena, viajeId);
      expect(actual.find((p) => p.id === sena.id)?.estado).toBe("pendiente");
      expect(actual.find((p) => p.id === sena.id)?.forma_pago).toBeNull();
      await expect(page.getByText("Reservado", { exact: true })).toBeVisible();
    });
  });

  test("CU-27 cancelar un viaje con cobros, revertir la cancelación, y un finalizado no se cancela", async ({
    page,
  }) => {
    test.slow();
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const cancelable = await armarViaje(duena, "Cancelar", "600000.00", [
      { tipo: "sena", monto: "200000.00", dias: 10 },
      { tipo: "saldo", monto: "400000.00", dias: 40 },
    ]);
    const sena = cancelable.pagos.find((p) => p.tipo === "sena") as PagoApi;
    const saldo = cancelable.pagos.find((p) => p.tipo === "saldo") as PagoApi;
    await cobrar(duena, sena.id);
    expect((await viajeDe(duena, cancelable.viajeId)).estado).toBe("vendido");

    await ingresar(page, DUENA.email, DUENA.password);
    await page.goto(`/viajes/${cancelable.viajeId}`);
    const motivo = `Cambio de planes ${SUFIJO}`;

    await test.step("RF-048 y RF-052 cancelar con cobros: se informa lo cobrado, el viaje queda «cancelado» y el pago sin cobrar «anulado»", async () => {
      await page.getByRole("button", { name: "Cancelar viaje" }).click();
      const dialogo = page.getByRole("dialog", { name: "Cancelar viaje" });
      await expect(dialogo.getByText(/Ya se cobraron/)).toBeVisible();
      await expect(dialogo.getByText(/Cualquier reembolso o penalidad se gestiona por fuera/)).toBeVisible();
      await dialogo.getByLabel("Motivo de la cancelación").fill(motivo);
      await dialogo.getByRole("button", { name: "Cancelar viaje" }).click();
      await expect(dialogo).toHaveCount(0);

      const viaje = await viajeDe(duena, cancelable.viajeId);
      expect(viaje.estado).toBe("cancelado");
      expect(viaje.estado_previo).toBe("vendido");
      expect(viaje.motivo_cancelacion).toBe(motivo);
      const pagos = await pagosDe(duena, cancelable.viajeId);
      // El plan que lista la API no incluye los anulados.
      expect(pagos.find((p) => p.id === saldo.id)).toBeUndefined();
      // El cobro ya registrado se conserva tal cual.
      expect(pagos.find((p) => p.id === sena.id)?.estado).toBe("pagado");
      await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
    });

    await test.step("RF-053 revertir la cancelación: vuelve al estado previo y el pago anulado se reactiva", async () => {
      await page.getByRole("button", { name: "Revertir cancelación" }).click();
      const dialogo = page.getByRole("dialog", { name: "Revertir la cancelación del viaje" });
      await dialogo.getByRole("button", { name: "Revertir cancelación" }).click();
      await expect(dialogo).toHaveCount(0);

      const viaje = await viajeDe(duena, cancelable.viajeId);
      expect(viaje.estado).toBe("vendido");
      expect(viaje.estado_previo).toBeNull();
      expect(viaje.motivo_cancelacion).toBeNull();
      const pagos = await pagosDe(duena, cancelable.viajeId);
      expect(pagos.find((p) => p.id === saldo.id)?.estado).toBe("pendiente");
      expect(pagos.find((p) => p.id === sena.id)?.estado).toBe("pagado");
      await expect(page.getByText("Vendido", { exact: true })).toBeVisible();
    });

    await test.step("RF-049 un viaje finalizado no se cancela: la web no ofrece la acción y la API lo rechaza", async () => {
      const finalizado = await armarViaje(duena, "Finalizado", "300000.00", [
        { tipo: "saldo", monto: "300000.00", dias: 10 },
      ]);
      await cobrar(duena, finalizado.pagos[0]?.id ?? "");
      await api(duena, "POST", `/viajes/${finalizado.viajeId}/iniciar`);
      await api(duena, "POST", `/viajes/${finalizado.viajeId}/finalizar`);
      expect((await viajeDe(duena, finalizado.viajeId)).estado).toBe("finalizado");

      await page.goto(`/viajes/${finalizado.viajeId}`);
      await expect(page.getByText("Finalizado", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Corregir estado" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancelar viaje" })).toHaveCount(0);

      const intento = await llamar(duena, "POST", `/viajes/${finalizado.viajeId}/cancelar`, {
        motivo_cancelacion: "No debería poder",
        fecha_cancelacion: hoy(),
      });
      expect(intento.status).toBeGreaterThanOrEqual(400);
      expect(intento.status).toBeLessThan(500);
      expect((await viajeDe(duena, finalizado.viajeId)).estado).toBe("finalizado");
    });
  });
});
