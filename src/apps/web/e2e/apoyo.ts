import { expect, type Page } from "@playwright/test";
import { EMULADOR, URL_BASE } from "./compose";

// Apoyo común de los e2e que arman datos por la API y entran por la web (T-118). Los specs
// comparten una sola base y un emulador: todo lo que se crea lleva este sufijo único.
export const SUFIJO = String(Date.now());

export interface Id {
  id: string;
}

export interface PagoApi {
  id: string;
  tipo: string;
  monto: string;
  vencimiento: string;
  estado: string;
  forma_pago: string | null;
}

/** Fecha de hoy en Buenos Aires, como la calcula la web (`hoyEnBuenosAires`). */
export function hoy(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** dd/mm/aa, el formato de fechas de negocio y del `--fecha` del proceso diario. */
export function ddmmaa(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(2, 4)}`;
}

export async function ingresar(pagina: Page, email: string, password: string): Promise<void> {
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
export async function tokenDe(email: string, password: string): Promise<string> {
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

export async function api<T>(
  token: string,
  metodo: string,
  ruta: string,
  cuerpo?: object,
): Promise<T> {
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

export interface PagoPlan {
  tipo: "sena" | "cuota" | "saldo";
  monto: string;
  dias: number;
}

export interface OpcionesViaje {
  precio: string;
  plan: PagoPlan[];
  /** Asesor asignado al cliente; por defecto, ninguno. */
  asesorId?: string;
  /** Responsable del viaje (el que acota el dashboard del empleado); por defecto, quien reserva. */
  responsableId?: string;
  /** Días desde hoy; por defecto, salida a 120 y regreso a 128. */
  salidaEnDias?: number;
  regresoEnDias?: number;
}

/**
 * Viaje «Reservado» armado por la API: destino, cliente, oportunidad, cotización aceptada por
 * `precio` y confirmación de la reserva con el plan dado (la suma del plan tiene que ser el
 * precio).
 */
export async function armarViaje(
  token: string,
  etiqueta: string,
  opciones: OpcionesViaje,
): Promise<{
  viajeId: string;
  clienteId: string;
  nombreCliente: string;
  nombreDestino: string;
  pagos: PagoApi[];
}> {
  const { precio, plan, asesorId, responsableId, salidaEnDias = 120, regresoEnDias = 128 } = opciones;
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
    asesor_asignado_id: asesorId,
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

  const viaje = await api<Id>(token, "POST", `/oportunidades/${oportunidad.id}/confirmar-reserva`, {
    destino_id: destino.id,
    fecha_salida: sumarDias(HOY, salidaEnDias),
    fecha_regreso: sumarDias(HOY, regresoEnDias),
    categoria: "individual",
    responsable_id: responsableId,
    economia: { precio_venta: precio, costo: "1000.00" },
    plan_de_pagos: {
      pagos: plan.map((p) => ({
        tipo: p.tipo,
        monto: p.monto,
        vencimiento: sumarDias(HOY, p.dias),
      })),
    },
  });
  const pagos = await api<PagoApi[]>(token, "GET", `/viajes/${viaje.id}/pagos`);
  expect(pagos, "la reserva debería crear el plan pedido").toHaveLength(plan.length);
  return { viajeId: viaje.id, clienteId: cliente.id, nombreCliente, nombreDestino, pagos };
}
