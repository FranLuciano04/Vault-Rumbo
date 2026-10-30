import {
  ETIQUETA_MOTIVO_PERDIDA,
  type CanalOportunidad,
  type CategoriaViaje,
  hoyEnBuenosAires,
  type Moneda,
  type MotivoPerdida,
  type TipoPago,
} from "@rumbo/shared";
import { z } from "zod";
import { DECIMAL } from "../viajes/esquemas";

/** Interacción nueva de la línea de tiempo (RF-014): solo el texto; la fecha y el nombre los pone la pantalla. */
export const esquemaInteraccion = z.object({
  texto: z.string().trim().min(1, "Escribí qué pasó en la interacción."),
});

/** Insistencia (RF-015): cuándo volver a contactar y para qué. */
export const esquemaInsistencia = z.object({
  fecha: z.iso.date("Elegí una fecha."),
  descripcion: z.string().trim().min(1, "Escribí qué hay que hacer."),
});

const MOTIVOS = Object.keys(ETIQUETA_MOTIVO_PERDIDA) as [MotivoPerdida, ...MotivoPerdida[]];

/** Perder la oportunidad (RF-017): motivo de la lista fija; con «otro» el detalle es obligatorio. */
export const esquemaPerder = z
  .object({
    motivo_perdida: z.enum(MOTIVOS, "Elegí un motivo."),
    motivo_perdida_detalle: z.string().trim(),
  })
  .refine((d) => d.motivo_perdida !== "otro" || d.motivo_perdida_detalle !== "", {
    path: ["motivo_perdida_detalle"],
    message: "Contanos el motivo.",
  });

/** Pasajeros: entero de al menos uno. Con el campo numérico vacío (NaN) los obligatorios piden el dato y los opcionales lo dan por ausente. */
const sinNaN = (valor: number | undefined) => (Number.isNaN(valor) ? undefined : valor);
const pasajerosCargados = z
  .number("Ingresá los pasajeros.")
  .int("Ingresá los pasajeros.")
  .min(1, "Ingresá al menos un pasajero.");
const pasajerosOpcionales = z
  .custom<number>(() => true)
  .optional()
  .transform(sinNaN)
  .pipe(pasajerosCargados.optional());

const destinoCargado = z.string().trim().max(200, "El destino puede tener hasta 200 caracteres.");

/**
 * Completar o corregir el destino y los pasajeros de una consulta (RF-013, DEC-0023). Cada dato se
 * completa por separado: el que ya estaba cargado es obligatorio y no se vacía; el que falta es opcional.
 */
export function esquemaDestinoPasajeros(cargados: { destino: boolean; pasajeros: boolean }) {
  return z.object({
    destino_consultado: cargados.destino
      ? destinoCargado.min(1, "Ingresá el destino.")
      : destinoCargado.optional(),
    pasajeros: cargados.pasajeros ? pasajerosCargados : pasajerosOpcionales,
  }) as z.ZodType<DatosDestinoPasajeros, EntradaDestinoPasajeros>;
}

const CANALES = [
  "instagram",
  "whatsapp",
  "presencial",
] as const satisfies readonly CanalOportunidad[];

/** Consulta nueva (RF-010, RF-013): solo cliente y canal son obligatorios (DEC-0023); si se cargan, el destino y los pasajeros se validan. */
export const esquemaConsulta = z
  .object({
    cliente_id: z.string().min(1, "Elegí un cliente."),
    canal: z.enum(CANALES, "Elegí el canal."),
    destino_consultado: destinoCargado.optional(),
    fecha_desde_tentativa: z.string(),
    fecha_hasta_tentativa: z.string(),
    pasajeros: pasajerosOpcionales,
    notas: z.string(),
  })
  .refine(
    (d) =>
      !d.fecha_desde_tentativa ||
      !d.fecha_hasta_tentativa ||
      d.fecha_hasta_tentativa >= d.fecha_desde_tentativa,
    {
      path: ["fecha_hasta_tentativa"],
      message: "La fecha hasta no puede ser anterior a la fecha desde.",
    },
  );

const importe = z
  .string()
  .trim()
  .regex(DECIMAL, "Ingresá un importe válido, por ejemplo 150000 o 1200.50.");
const CATEGORIAS = ["grupal", "individual"] as const satisfies readonly CategoriaViaje[];
const MONEDAS = ["ARS", "USD"] as const satisfies readonly Moneda[];
const TIPOS_DE_PAGO = ["sena", "cuota", "saldo"] as const satisfies readonly TipoPago[];

/**
 * Confirmar la reserva (RF-032, RF-033): destino, fechas y categoría son obligatorios; el contrato
 * también pide la economía y una cuota única por el precio de venta, que luego se ajustan en la ficha.
 */
export const esquemaReserva = z
  .object({
    destino_id: z.string().min(1, "Elegí un destino."),
    fecha_salida: z.iso.date("Ingresá la fecha de salida."),
    fecha_regreso: z.iso.date("Ingresá la fecha de regreso."),
    categoria: z.enum(CATEGORIAS, "Elegí una categoría."),
    responsable_id: z.string(),
    moneda: z.enum(MONEDAS),
    precio_venta: importe.refine(
      (v) => Number(v) > 0,
      "El precio de venta tiene que ser mayor a cero.",
    ),
    costo: importe,
    tipo_de_pago: z.enum(TIPOS_DE_PAGO),
    vencimiento: z.iso
      .date("Ingresá la fecha de vencimiento.")
      .refine((v) => v >= hoyEnBuenosAires(), "El vencimiento no puede ser anterior a hoy."),
  })
  .refine((d) => d.fecha_regreso >= d.fecha_salida, {
    path: ["fecha_regreso"],
    message: "El regreso no puede ser anterior a la salida.",
  });

export type DatosReserva = z.infer<typeof esquemaReserva>;
export type EntradaConsulta = z.input<typeof esquemaConsulta>;
export type DatosConsulta = z.output<typeof esquemaConsulta>;
export type EntradaDestinoPasajeros = { destino_consultado?: string; pasajeros?: number };
export type DatosDestinoPasajeros = { destino_consultado?: string; pasajeros?: number };
export type DatosInteraccion = z.infer<typeof esquemaInteraccion>;
export type DatosInsistencia = z.infer<typeof esquemaInsistencia>;
export type DatosPerder = z.input<typeof esquemaPerder>;
