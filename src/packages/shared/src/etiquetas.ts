import type { HistorialCliente, SegmentoCliente } from "./cliente";
import type { EstadoAlerta, MotivoPerdida, TipoAlerta } from "./modelos";

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
