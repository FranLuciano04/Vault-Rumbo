import { expect, test } from "@playwright/test";
import {
  api,
  armarViaje,
  ddmmaa,
  hoy,
  ingresar,
  type Id,
  type PagoApi,
  SUFIJO,
  sumarDias,
  tokenDe,
} from "./apoyo";
import { compose, DUENA, elegirContrasena } from "./compose";

// T-118: el proceso diario (CU-30, RF-026, RF-027, RF-039) contra el sistema real. Los datos de
// partida se arman por la API; el proceso se corre con `--fecha` por el mismo comando que usa el
// scheduler (`python -m rumbo.presentacion.jobs.diario`) y sus efectos se leen por la API y en la
// agenda web. No depende de las semillas de demo: la base y el emulador se comparten entre specs,
// así que todo lleva un sufijo único y las aserciones se atan a los ids de lo creado aquí.
// Ojo: el proceso es global (no distingue datos de este spec) y corre una sola vez, en el
// `beforeAll`. Solo podría afectar a un spec posterior que dependa de datos creados antes de la
// corrida (por ejemplo, las semillas de demo); los que arman sus propios datos no lo notan.
const CLAVE = "Clave-de-prueba-4";

interface Persona {
  id: string;
  nombre: string;
  email: string;
}

interface CotizacionApi {
  id: string;
  estado: string;
  validez_hasta: string;
}

interface AlertaApi {
  id: string;
  tipo: string;
  estado: string;
  cliente_id: string | null;
  viaje_id: string | null;
  fecha: string;
  descripcion: string;
}

interface PaginaAlertas {
  items: AlertaApi[];
  total: number;
}

/** Alta de una persona del equipo por la API, con contraseña elegida (DEC-0016). */
async function crearEmpleado(etiqueta: string): Promise<Persona> {
  const email = `empleado-${etiqueta}-${SUFIJO}@rumbo.test`;
  const nombre = `Empleado ${etiqueta} E2E ${SUFIJO}`;
  const duena = await tokenDe(DUENA.email, DUENA.password);
  const { id } = await api<Id>(duena, "POST", "/usuarios", { nombre, email, rol: "empleado" });
  await elegirContrasena(email, CLAVE);
  return { id, nombre, email };
}

/** Corre el proceso diario como el scheduler, pero con una fecha fija; falla si algún paso falló. */
function correrProceso(fecha: string): string {
  return compose([
    "exec",
    "-T",
    "api",
    "python",
    "-m",
    "rumbo.presentacion.jobs.diario",
    "--fecha",
    ddmmaa(fecha),
  ]);
}

const alertasDeViaje = async (token: string, viajeId: string): Promise<AlertaApi[]> =>
  (
    await api<PaginaAlertas>(token, "GET", "/alertas?proximas=true&tipo=viaje&por_pagina=100")
  ).items.filter((a) => a.viaje_id === viajeId);

const sugerenciasDe = async (token: string): Promise<PaginaAlertas> =>
  api<PaginaAlertas>(token, "GET", "/alertas?proximas=true&tipo=recontacto&por_pagina=100");

test.describe.serial("CU-30 Proceso diario de punta a punta", () => {
  let empleado: Persona;
  let tokenEmpleado: string;
  let duena: string;
  let fechaDelProceso: string;
  let viajeConPagos: string;
  let senaId: string;
  let saldoId: string;
  let cotizacionId: string;
  let viajeConfirmado: string;
  let clienteInactivo: { clienteId: string; nombreCliente: string };

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    const HOY = hoy();
    empleado = await crearEmpleado("diario");
    duena = await tokenDe(DUENA.email, DUENA.password);
    tokenEmpleado = await tokenDe(empleado.email, CLAVE);

    // Pago a vencer: la seña vence en 5 días y el saldo mucho después de la fecha del proceso.
    const conPagos = await armarViaje(duena, "Pagos", {
      salidaEnDias: 120,
      regresoEnDias: 128,
      precio: "900000.00",
      plan: [
        { tipo: "sena", monto: "300000.00", dias: 5 },
        { tipo: "saldo", monto: "600000.00", dias: 90 },
      ],
    });
    viajeConPagos = conPagos.viajeId;
    const pagos = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeConPagos}/pagos`);
    senaId = (pagos.find((p) => p.tipo === "sena") as PagoApi).id;
    saldoId = (pagos.find((p) => p.tipo === "saldo") as PagoApi).id;

    // Cotización a vencer: enviada y sin respuesta; vence 1 mes después de emitirla.
    const cliente = await api<Id>(duena, "POST", "/clientes", {
      nombre: `Cliente Cotización E2E ${SUFIJO}`,
      contacto: `cotizacion-${SUFIJO}@rumbo.test`,
      segmento: "pareja",
    });
    const oportunidad = await api<Id>(duena, "POST", "/oportunidades", {
      cliente_id: cliente.id,
      canal: "whatsapp",
      destino_consultado: `Destino Cotización ${SUFIJO}`,
      pasajeros: 2,
    });
    await api(duena, "POST", `/oportunidades/${oportunidad.id}/en-gestion`);
    const borrador = await api<Id>(duena, "POST", `/oportunidades/${oportunidad.id}/cotizaciones`, {
      moneda: "ARS",
      items: [{ concepto: "Paquete completo", precio: "500000.00" }],
    });
    const enviada = await api<CotizacionApi>(duena, "POST", `/cotizaciones/${borrador.id}/enviar`);
    cotizacionId = enviada.id;
    expect(enviada.estado).toBe("enviada");

    // Cliente inactivo: su único viaje (no cancelado) terminó hace ~7 meses y su asesor es el
    // empleado de este spec; el viaje ya está reservado, así que no tiene oportunidad abierta.
    clienteInactivo = await armarViaje(duena, "Inactivo", {
      asesorId: empleado.id,
      salidaEnDias: -210,
      regresoEnDias: -200,
      precio: "400000.00",
      plan: [{ tipo: "saldo", monto: "400000.00", dias: -215 }],
    });

    // Viaje «Confirmado» que ya salió a la fecha del proceso: su plan está cobrado por completo.
    const confirmado = await armarViaje(duena, "Confirmado", {
      salidaEnDias: 10,
      regresoEnDias: 18,
      precio: "200000.00",
      plan: [{ tipo: "saldo", monto: "200000.00", dias: 5 }],
    });
    viajeConfirmado = confirmado.viajeId;
    await api(duena, "POST", `/pagos/${(confirmado.pagos[0] as PagoApi).id}/cobrar`, {
      fecha_cobro: HOY,
      forma_pago: "transferencia",
      moneda_pago: "ARS",
    });
    const previo = await api<{ estado: string }>(duena, "GET", `/viajes/${viajeConfirmado}`);
    expect(previo.estado).toBe("confirmado");

    // La fecha del proceso es el día siguiente a la vigencia de la cotización.
    fechaDelProceso = sumarDias(enviada.validez_hasta, 1);
    expect(fechaDelProceso > HOY).toBe(true);

    // Antes de correr el proceso nada está vencido ni sugerido.
    const antes = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeConPagos}/pagos`);
    expect(antes.every((p) => p.estado === "pendiente")).toBe(true);
    expect((await sugerenciasDe(tokenEmpleado)).total).toBe(0);

    console.log(correrProceso(fechaDelProceso));
  });

  test("RF-039 avance: el viaje confirmado que ya salió recibe una sugerencia y no avanza solo", async () => {
    const sugerencias = await alertasDeViaje(duena, viajeConfirmado);
    expect(sugerencias, "una sola sugerencia para el viaje").toHaveLength(1);
    expect(sugerencias[0]?.estado).toBe("pendiente");
    const viaje = await api<{ estado: string }>(duena, "GET", `/viajes/${viajeConfirmado}`);
    expect(viaje.estado, "el empleado confirma el avance: el proceso no lo hace").toBe(
      "confirmado",
    );
  });

  test("RF-026 vencimiento: el pago pendiente y la cotización enviada sin respuesta vencen", async () => {
    const pagos = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeConPagos}/pagos`);
    const sena = pagos.find((p) => p.id === senaId);
    const saldo = pagos.find((p) => p.id === saldoId);
    expect(sena?.estado, "la seña ya venció a la fecha del proceso").toBe("vencido");
    expect(saldo?.estado, "el saldo todavía no vence").toBe("pendiente");

    const cotizacion = await api<CotizacionApi>(duena, "GET", `/cotizaciones/${cotizacionId}`);
    expect(cotizacion.estado).toBe("vencida");
  });

  test("RF-027 recontacto: el cliente fiel inactivo recibe una sugerencia para su asesor", async () => {
    const sugerencias = await sugerenciasDe(tokenEmpleado);
    const propias = sugerencias.items.filter((a) => a.cliente_id === clienteInactivo.clienteId);
    expect(propias, "una sola sugerencia para el cliente inactivo").toHaveLength(1);
    expect(propias[0]?.estado).toBe("pendiente");
    expect(propias[0]?.fecha).toBe(fechaDelProceso);
  });

  test("idempotencia: correr el proceso otra vez con la misma fecha no duplica ni cambia nada", async () => {
    const pagosAntes = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeConPagos}/pagos`);
    const sugerenciasAntes = await sugerenciasDe(tokenEmpleado);
    const agendaAntes = await api<PaginaAlertas>(
      tokenEmpleado,
      "GET",
      "/alertas?proximas=true&por_pagina=100",
    );

    correrProceso(fechaDelProceso);

    expect(await alertasDeViaje(duena, viajeConfirmado)).toHaveLength(1);
    const viaje = await api<{ estado: string }>(duena, "GET", `/viajes/${viajeConfirmado}`);
    expect(viaje.estado).toBe("confirmado");

    const pagosDespues = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeConPagos}/pagos`);
    expect(pagosDespues).toEqual(pagosAntes);
    const sugerenciasDespues = await sugerenciasDe(tokenEmpleado);
    expect(sugerenciasDespues.total).toBe(sugerenciasAntes.total);
    expect(
      sugerenciasDespues.items.filter((a) => a.cliente_id === clienteInactivo.clienteId),
    ).toHaveLength(1);
    const agendaDespues = await api<PaginaAlertas>(
      tokenEmpleado,
      "GET",
      "/alertas?proximas=true&por_pagina=100",
    );
    expect(agendaDespues.total).toBe(agendaAntes.total);
    const cotizacion = await api<CotizacionApi>(duena, "GET", `/cotizaciones/${cotizacionId}`);
    expect(cotizacion.estado).toBe("vencida");
  });

  test("RF-027 recontacto: la sugerencia se atiende desde la web", async ({ page }) => {
    const sugerencias = await sugerenciasDe(tokenEmpleado);
    const sugerencia = sugerencias.items.find(
      (a) => a.cliente_id === clienteInactivo.clienteId,
    ) as AlertaApi;

    await ingresar(page, empleado.email, CLAVE);
    // La sugerencia nace con la fecha del proceso (posterior a hoy): está en Próximas.
    await page.getByRole("tab", { name: /Próximas/ }).click();
    const fila = page.getByRole("listitem").filter({ hasText: sugerencia.descripcion });
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: `Ver detalle: ${sugerencia.descripcion}` }).click();

    const panel = page.getByRole("dialog", { name: /detalle de la alerta/i });
    const tarjeta = panel.getByRole("region", { name: /sugerencia de recontacto/i });
    await expect(tarjeta.getByText(clienteInactivo.nombreCliente)).toBeVisible();

    await tarjeta.getByRole("button", { name: /no recontactar/i }).click();
    await tarjeta.getByRole("button", { name: /confirmar/i }).click();
    await expect(panel).toBeHidden();
    await expect(fila).toHaveCount(0);

    // Quedó persistido: el cliente tiene el opt-out y la sugerencia salió de la agenda.
    const cliente = await api<{ no_recontactar: boolean }>(
      tokenEmpleado,
      "GET",
      `/clientes/${clienteInactivo.clienteId}`,
    );
    expect(cliente.no_recontactar).toBe(true);
    const alerta = await api<AlertaApi>(tokenEmpleado, "GET", `/alertas/${sugerencia.id}`);
    expect(alerta.estado).toBe("resuelta");
  });
});
