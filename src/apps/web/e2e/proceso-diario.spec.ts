import { expect, type Page, test } from "@playwright/test";
import { compose, DUENA, EMULADOR, elegirContrasena, URL_BASE } from "./compose";

// T-118: el proceso diario (CU-30, RF-026, RF-027) contra el sistema real. Los datos de partida se
// arman por la API; el proceso se corre con `--fecha` por el mismo comando que usa el scheduler
// (`python -m rumbo.presentacion.jobs.diario`) y sus efectos se leen por la API y en la agenda web.
// No depende de las semillas de demo: la base y el emulador se comparten entre specs, así que todo
// lleva un sufijo único y las aserciones se atan a los ids de lo creado aquí.
// Ojo: el proceso es global (no distingue datos de este spec). Corre en este archivo, después de
// los specs que arman datos de plazo corto, y con una fecha apenas posterior a la vigencia de la
// cotización, para tocar lo menos posible de los demás.
const SUFIJO = String(Date.now());
const CLAVE = "Clave-de-prueba-4";

interface Id {
  id: string;
}

interface Persona {
  id: string;
  nombre: string;
  email: string;
}

interface PagoApi {
  id: string;
  tipo: string;
  estado: string;
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
  fecha: string;
  descripcion: string;
}

interface PaginaAlertas {
  items: AlertaApi[];
  total: number;
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

/** dd/mm/aa, el formato de fechas de negocio y del `--fecha` del proceso. */
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

/** Alta de una persona del equipo por la API, con contraseña elegida (DEC-0016). */
async function crearEmpleado(etiqueta: string): Promise<Persona> {
  const email = `empleado-${etiqueta}-${SUFIJO}@rumbo.test`;
  const nombre = `Empleado ${etiqueta} E2E ${SUFIJO}`;
  const duena = await tokenDe(DUENA.email, DUENA.password);
  const { id } = await api<Id>(duena, "POST", "/usuarios", { nombre, email, rol: "empleado" });
  await elegirContrasena(email, CLAVE);
  return { id, nombre, email };
}

interface PagoPlan {
  tipo: "sena" | "cuota" | "saldo";
  monto: string;
  dias: number;
}

/**
 * Viaje «Reservado» armado por la API: cliente (con asesor si se pasa), oportunidad, cotización
 * aceptada y confirmación de la reserva con el plan dado (la suma del plan es el precio).
 */
async function armarViaje(
  token: string,
  etiqueta: string,
  opciones: {
    asesorId?: string;
    salidaEnDias: number;
    regresoEnDias: number;
    precio: string;
    plan: PagoPlan[];
  },
): Promise<{ viajeId: string; clienteId: string; nombreCliente: string }> {
  const HOY = hoy();
  const nombreDestino = `Destino ${etiqueta} ${SUFIJO}`;
  const nombreCliente = `Cliente ${etiqueta} E2E ${SUFIJO}`;
  const destino = await api<Id>(token, "POST", "/destinos", {
    nombre: nombreDestino,
    pais: "Argentina",
  });
  const cliente = await api<Id>(token, "POST", "/clientes", {
    nombre: nombreCliente,
    contacto: `${etiqueta.toLowerCase()}-${SUFIJO}@rumbo.test`,
    segmento: "pareja",
    asesor_asignado_id: opciones.asesorId,
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
    items: [{ concepto: "Paquete completo", precio: opciones.precio }],
  });
  await api(token, "POST", `/cotizaciones/${cotizacion.id}/enviar`);
  await api(token, "POST", `/cotizaciones/${cotizacion.id}/aceptar`);
  const viaje = await api<Id>(token, "POST", `/oportunidades/${oportunidad.id}/confirmar-reserva`, {
    destino_id: destino.id,
    fecha_salida: sumarDias(HOY, opciones.salidaEnDias),
    fecha_regreso: sumarDias(HOY, opciones.regresoEnDias),
    categoria: "individual",
    economia: { precio_venta: opciones.precio, costo: "1000.00" },
    plan_de_pagos: {
      pagos: opciones.plan.map((p) => ({
        tipo: p.tipo,
        monto: p.monto,
        vencimiento: sumarDias(HOY, p.dias),
      })),
    },
  });
  return { viajeId: viaje.id, clienteId: cliente.id, nombreCliente };
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

    // La fecha del proceso es el día siguiente a la vigencia de la cotización.
    fechaDelProceso = sumarDias(enviada.validez_hasta, 1);
    expect(fechaDelProceso > HOY).toBe(true);

    // Antes de correr el proceso nada está vencido ni sugerido.
    const antes = await api<PagoApi[]>(duena, "GET", `/viajes/${viajeConPagos}/pagos`);
    expect(antes.every((p) => p.estado === "pendiente")).toBe(true);
    expect((await sugerenciasDe(tokenEmpleado)).total).toBe(0);

    console.log(correrProceso(fechaDelProceso));
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
