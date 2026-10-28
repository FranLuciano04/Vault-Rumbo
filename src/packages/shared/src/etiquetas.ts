import type { HistorialCliente, SegmentoCliente } from "./cliente";
import type { EstadoAlerta, EstadoCotizacion, MotivoPerdida, TipoAlerta } from "./modelos";

/** Texto de cada segmento tal como se muestra; el orden es el de los chips del prototipo. */
export const ETIQUETA_SEGMENTO: Record<SegmentoCliente, string> = {
  familia: "Familia",
  pareja: "Pareja",
  amigos: "Amigos",
  individual: "Individual",
};

export const ETIQUETA_ESTADO_OPORTUNIDAD: Record<
  HistorialCliente["oportunidades"][number]["estado"],
  string
> = {
  nueva: "Nueva",
  en_gestion: "En gestión",
  cotizada: "Cotizada",
  ganada: "Ganada",
  perdida: "Perdida",
};

export const ETIQUETA_ESTADO_VIAJE: Record<HistorialCliente["viajes"][number]["estado"], string> = {
  reservado: "Reservado",
  vendido: "Vendido",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

/** Texto de cada tipo de alerta de la agenda (CU-14). */
export const ETIQUETA_TIPO_ALERTA: Record<TipoAlerta, string> = {
  pago: "Pago",
  formulario: "Formulario",
  salida: "Salida",
  insistencia: "Insistencia",
  resena: "Reseña",
  manual: "Recordatorio",
  recontacto: "Recontacto",
  viaje: "Viaje",
};

/** Texto de cada estado de una alerta. */
export const ETIQUETA_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  pendiente: "Pendiente",
  vista: "Vista",
  resuelta: "Resuelta",
};

/** Texto de cada motivo de pérdida de una oportunidad (CU-05). */
export const ETIQUETA_MOTIVO_PERDIDA: Record<MotivoPerdida, string> = {
  precio: "Precio",
  fechas_disponibilidad: "Fechas o disponibilidad",
  desistio: "Desistió",
  otra_agencia: "Otra agencia",
  sin_respuesta: "Sin respuesta",
  otro: "Otro",
};

/** Texto de cada estado de la cotización (CU-06). */
export const ETIQUETA_ESTADO_COTIZACION: Record<EstadoCotizacion, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

/** Texto cuando una consulta todavía no tiene destino (DEC-0023). */
export const DESTINO_A_DEFINIR = "Destino a definir";

/** Pasajeros de una consulta como se muestran: «1 pasajero», «3 pasajeros» o «—» si faltan (DEC-0023). */
export function textoPasajeros(pasajeros: number | null): string {
  if (pasajeros === null) return "—";
  return `${String(pasajeros)} ${pasajeros === 1 ? "pasajero" : "pasajeros"}`;
}

/** Categorías de hotel que ofrece el catálogo (CU-16, CU-18); en la API son texto libre. */
export const CATEGORIAS_HOTEL = [
  "1 estrella",
  "2 estrellas",
  "3 estrellas",
  "4 estrellas",
  "5 estrellas",
] as const;

/** Servicios filtrables del catálogo de hoteles, en el orden de la pantalla 21 del prototipo. */
export const SERVICIOS_HOTEL = [
  "pileta",
  "desayuno incluido",
  "wifi",
  "estacionamiento",
  "spa",
  "apto mascotas",
] as const;
