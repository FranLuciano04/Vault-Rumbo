import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { api, armarViaje, hoy, ingresar, type Id, type PagoApi, SUFIJO, tokenDe } from "./apoyo";
import { DUENA, elegirContrasena, URL_BASE } from "./compose";

// T-128: el tablero de gestión (CU-21 dashboard, CU-22 reportes, CU-23 calendario) contra el
// sistema real y las semillas de demo (`datos-iniciales --demo`). Los datos propios se arman por
// la API con sufijo único, porque la base se comparte con los demás specs. Las aserciones sobre
// la semilla se leen de la API (las fechas de la demo son relativas al día de la corrida).
const CLAVE = "Clave-de-prueba-4";

interface EventoApi {
  tipo: "viaje" | "vencimiento" | "alerta";
  titulo: string;
  desde: string;
  hasta: string;
  viaje_id: string | null;
}

interface MontoApi {
  moneda: string;
  monto: string;
}

interface DashboardApi {
  cobrado: MontoApi[];
}

const mesEnCurso = () => {
  const [anio, mes] = hoy().split("-").map(Number) as [number, number];
  const prefijo = `${String(anio)}-${String(mes).padStart(2, "0")}`;
  const ultimo = new Date(anio, mes, 0).getDate();
  return { desde: `${prefijo}-01`, hasta: `${prefijo}-${String(ultimo).padStart(2, "0")}` };
};

const totalCobrado = (montos: MontoApi[]) =>
  montos.reduce((suma, m) => suma + Number(m.monto), 0);

/** Como `formatearImporte` del front para ARS: «$ 1.234,50». */
const enPesos = (monto: number) =>
  `$ ${monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** El importe como texto completo: sin dígitos ni separadores pegados a la izquierda ni a la derecha. */
const importeExacto = (importe: string) =>
  new RegExp(String.raw`(?<![\d.,])${importe.replace(/[$.]/g, String.raw`\$&`)}(?![\d.,])`);

const ARS = (montos: MontoApi[]) => montos.filter((m) => m.moneda === "ARS");

test.describe.serial("Tablero de gestión de punta a punta", () => {
  const emailEmpleado = `empleado-gestion-${SUFIJO}@rumbo.test`;
  let duena: string;
  let empleado: string;
  let viajeDeHoy: { viajeId: string; nombreDestino: string; nombreCliente: string };

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    duena = await tokenDe(DUENA.email, DUENA.password);
    const { id: empleadoId } = await api<Id>(duena, "POST", "/usuarios", {
      nombre: `Empleado Gestión E2E ${SUFIJO}`,
      email: emailEmpleado,
      rol: "empleado",
    });
    await elegirContrasena(emailEmpleado, CLAVE);
    empleado = await tokenDe(emailEmpleado, CLAVE);

    // Un viaje que sale hoy y un pago que vence hoy: siempre caen en el mes en curso.
    const propio = await armarViaje(duena, "Gestion", {
      salidaEnDias: 0,
      regresoEnDias: 5,
      precio: "800000.00",
      plan: [{ tipo: "sena", monto: "800000.00", dias: 0 }],
    });
    viajeDeHoy = propio;

    // Venta de la dueña, cobrada hoy, y venta del empleado (su asesor), cobrada hoy.
    const cobro = { fecha_cobro: hoy(), forma_pago: "transferencia", moneda_pago: "ARS" };
    await api(duena, "POST", `/pagos/${(propio.pagos[0] as PagoApi).id}/cobrar`, cobro);
    const delEmpleado = await armarViaje(duena, "GestionEmp", {
      asesorId: empleadoId,
      responsableId: empleadoId,
      precio: "250000.00",
      plan: [{ tipo: "sena", monto: "250000.00", dias: 3 }],
    });
    await api(duena, "POST", `/pagos/${(delEmpleado.pagos[0] as PagoApi).id}/cobrar`, cobro);
  });

  test("RF-136 calendario: muestra los viajes y vencimientos de la semilla", async ({ page }) => {
    // Semilla de demo: viajes entre -30 y +100 días con pagos de -90 a +60 días. «Pareja Demo
    // Fernández — Cancún» está en curso (salida -2, regreso +7): siempre contiene hoy. Los pagos
    // de la semilla (-90 a +60 días) dejan siempre al menos uno en el mes en curso.
    const { desde, hasta } = mesEnCurso();
    const delMes = await api<EventoApi[]>(duena, "GET", `/calendario?desde=${desde}&hasta=${hasta}`);
    const viajes = delMes.filter((e) => e.tipo === "viaje");
    const vencimientos = delMes.filter((e) => e.tipo === "vencimiento");
    const viajeDeLaSemilla = "Pareja Demo Fernández — Cancún";
    expect(
      viajes.map((e) => e.titulo),
      "el viaje en curso de la semilla",
    ).toContain(viajeDeLaSemilla);
    expect(
      vencimientos.filter((e) => !e.titulo.includes("E2E")).length,
      "algún vencimiento de la semilla (los de los e2e llevan «E2E» en el cliente)",
    ).toBeGreaterThan(0);
    // Las alertas del viaje (salida, formularios) también llevan su `viaje_id`: se excluyen.
    const delViajeDeHoy = delMes.filter(
      (e) => e.viaje_id === viajeDeHoy.viajeId && e.tipo !== "alerta",
    );
    expect(delViajeDeHoy.map((e) => e.tipo).sort()).toEqual(["vencimiento", "viaje"]);

    await ingresar(page, DUENA.email, DUENA.password);
    await page.getByRole("link", { name: "Calendario" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(hoy().slice(0, 4));

    for (const evento of [...viajes, ...vencimientos]) {
      await expect(
        page.getByRole("link", { name: evento.titulo }).first(),
        `el calendario debería mostrar «${evento.titulo}»`,
      ).toBeAttached();
    }
    await expect(page.getByRole("link", { name: viajeDeLaSemilla }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: viajeDeHoy.nombreDestino }).first()).toBeVisible();

    // El filtro por tipo deja solo los vencimientos: el título del viaje lleva el destino.
    await page.getByLabel("Tipo").selectOption("vencimiento");
    await expect(
      page.getByRole("link", { name: `Vence un pago de ${viajeDeHoy.nombreCliente}` }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: viajeDeHoy.nombreDestino })).toHaveCount(0);
  });

  test("RF-129 dashboard por rol: la dueña y un empleado ven cifras distintas", async ({
    browser,
  }) => {
    const deLaDuena = await api<DashboardApi>(duena, "GET", "/dashboard");
    const delEmpleado = await api<DashboardApi>(empleado, "GET", "/dashboard");
    expect(totalCobrado(deLaDuena.cobrado)).toBeGreaterThan(totalCobrado(delEmpleado.cobrado));
    expect(totalCobrado(delEmpleado.cobrado), "el empleado ve su propia venta").toBeGreaterThan(0);

    const esperadoDuena = enPesos(totalCobrado(ARS(deLaDuena.cobrado)));
    const esperadoEmpleado = enPesos(totalCobrado(ARS(delEmpleado.cobrado)));
    expect(esperadoEmpleado).toBe("$ 250.000,00");
    expect(esperadoDuena).not.toBe(esperadoEmpleado);

    const contextoDuena = await browser.newContext({ baseURL: URL_BASE, locale: "es-AR" });
    const contextoEmpleado = await browser.newContext({ baseURL: URL_BASE, locale: "es-AR" });
    try {
      const paginaDuena = await contextoDuena.newPage();
      await ingresar(paginaDuena, DUENA.email, DUENA.password);
      await paginaDuena.getByRole("link", { name: "Dashboard" }).click();
      await expect(paginaDuena.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      const cobradoDuena = paginaDuena.getByRole("link", { name: /Cobrado a pasajeros/ });
      await expect(cobradoDuena).toBeVisible();
      await expect(cobradoDuena).toContainText(importeExacto(esperadoDuena));
      await expect(paginaDuena.getByText("Ventas por vendedor")).toBeVisible();
      await expect(paginaDuena.getByLabel("Empleado")).toBeVisible();

      const paginaEmpleado = await contextoEmpleado.newPage();
      await ingresar(paginaEmpleado, emailEmpleado, CLAVE);
      await paginaEmpleado.getByRole("link", { name: "Dashboard" }).click();
      await expect(paginaEmpleado.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      const cobradoEmpleado = paginaEmpleado.getByRole("link", {
        name: /Cobrado a tus pasajeros/,
      });
      await expect(cobradoEmpleado).toBeVisible();
      await expect(cobradoEmpleado).toContainText(importeExacto(esperadoEmpleado));
      await expect(cobradoEmpleado).not.toContainText(importeExacto(esperadoDuena));
      await expect(paginaEmpleado.getByText("Ventas por vendedor")).toHaveCount(0);
      await expect(paginaEmpleado.getByLabel("Empleado")).toHaveCount(0);
      await expect(paginaEmpleado.getByText(/Ves solo tus ventas/)).toBeVisible();
    } finally {
      await contextoDuena.close();
      await contextoEmpleado.close();
    }
  });

  test("RF-133 exportar: un reporte se descarga a Excel y a PDF", async ({ page }) => {
    await ingresar(page, DUENA.email, DUENA.password);
    await page.getByRole("link", { name: "Reportes" }).click();
    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
    await expect(page.getByText(/Período: del/)).toBeVisible();

    const excel = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar Excel" }).click();
    const archivoExcel = await excel;
    expect(archivoExcel.suggestedFilename()).toMatch(/\.xlsx$/);
    const bytesExcel = await readFile(await archivoExcel.path());
    expect(bytesExcel.subarray(0, 2).toString("latin1"), "un .xlsx es un zip").toBe("PK");

    const pdf = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar PDF" }).click();
    const archivoPdf = await pdf;
    expect(archivoPdf.suggestedFilename()).toMatch(/\.pdf$/);
    const bytesPdf = await readFile(await archivoPdf.path());
    expect(bytesPdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
