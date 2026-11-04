import { expect, type Page, test } from "@playwright/test";
import {
  api,
  armarViaje as armarViajeBase,
  hoy,
  ingresar,
  type PagoApi,
  type PagoPlan,
  SUFIJO,
  sumarDias,
  tokenDe,
} from "./apoyo";
import { DUENA, URL_BASE } from "./compose";

// T-109: los flujos alternativos del viaje (CU-11, CU-12 y CU-27) contra el backend real. Cada test
// arma su propio viaje por la API (cliente, oportunidad, cotización aceptada y reserva con su plan
// de pagos), hace la excepción desde la web y lee el resultado por la API atado a los ids de ese
// viaje y de esos pagos. No depende de las semillas de demo: la base y el emulador se comparten
// entre specs, así que todo lleva un sufijo único.
interface ViajeApi {
  id: string;
  estado: string;
  estado_previo: string | null;
  motivo_cancelacion: string | null;
  precio_venta: string;
  saldo_pendiente: string;
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

/** Viaje «Reservado» del helper común, con la firma corta que usa este spec. */
const armarViaje = (token: string, etiqueta: string, precio: string, plan: PagoPlan[]) =>
  armarViajeBase(token, etiqueta, { precio, plan });

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

    await test.step("RF-066 anular un pago: sale del plan vigente, el plan exige la igualdad y se rebalancea hasta cuadrar", async () => {
      await fila(page, "Cuota").getByRole("button", { name: "Anular" }).click();
      const panel = page.getByRole("form", { name: /^¿Anular la cuota/ });
      await panel.getByRole("button", { name: "Confirmar" }).click();
      await expect(panel).toHaveCount(0);

      const pagos = await pagosDe(duena, viajeId);
      // El plan vigente que lista la API ya no incluye al pago anulado.
      expect(pagos.find((p) => p.id === cuota.id)).toBeUndefined();
      expect(pagos).toHaveLength(3);
      expect(suma(pagos)).toBe(600_000);
      expect(Number((await viajeDe(duena, viajeId)).precio_venta)).toBe(900_000);
      await expect(
        page.getByText(
          "Los pagos del plan no suman el precio de venta: rebalanceá el plan de pagos.",
        ),
      ).toBeVisible();

      // Se rebalancea desde «Editar plan»: los tres pagos no cobrados pasan a 300.000 cada uno.
      await page.getByRole("button", { name: "Editar plan" }).click();
      const editor = page.getByRole("form", { name: "Editor del plan de pagos" });
      const montos = editor.getByLabel(/^Monto /);
      await expect(montos).toHaveCount(3);
      for (let i = 0; i < 3; i++) await montos.nth(i).fill("300000");
      await expect(
        editor.getByText("La suma de los pagos coincide con el precio de venta."),
      ).toBeVisible();
      await editor.getByRole("button", { name: "Guardar plan" }).click();
      await expect(editor).toHaveCount(0);

      const rebalanceado = await pagosDe(duena, viajeId);
      expect(rebalanceado).toHaveLength(3);
      expect(rebalanceado.every((p) => Number(p.monto) === 300_000)).toBe(true);
      expect(suma(rebalanceado)).toBe(900_000);
      await expect(
        page.getByText(
          "Los pagos del plan no suman el precio de venta: rebalanceá el plan de pagos.",
        ),
      ).toHaveCount(0);
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

    await test.step("RF-048 y RF-052 cancelar con cobros: se informa lo cobrado, el viaje queda «cancelado» y el pago sin cobrar sale del plan vigente", async () => {
      await page.getByRole("button", { name: "Cancelar viaje" }).click();
      const dialogo = page.getByRole("dialog", { name: "Cancelar viaje" });
      await expect(dialogo.getByText(/Ya se cobraron\s+\$\s200\.000,00\./)).toBeVisible();
      await expect(
        dialogo.getByText(/Cualquier reembolso o penalidad se gestiona por fuera/),
      ).toBeVisible();
      await dialogo.getByLabel("Motivo de la cancelación").fill(motivo);
      await dialogo.getByRole("button", { name: "Cancelar viaje" }).click();
      await expect(dialogo).toHaveCount(0);

      const viaje = await viajeDe(duena, cancelable.viajeId);
      expect(viaje.estado).toBe("cancelado");
      expect(viaje.estado_previo).toBe("vendido");
      expect(viaje.motivo_cancelacion).toBe(motivo);
      expect(Number(viaje.saldo_pendiente)).toBe(0);
      const pagos = await pagosDe(duena, cancelable.viajeId);
      // El plan vigente que lista la API ya no incluye al pago anulado.
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
      expect(intento.status).toBe(409);
      expect((await viajeDe(duena, finalizado.viajeId)).estado).toBe("finalizado");
    });
  });
});
