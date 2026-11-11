import type { EstadoOportunidad } from "@rumbo/shared";

/** Columnas a las que se puede mover una oportunidad desde cada estado (EST-Oportunidad). `cotizada` nunca es destino: la fija la cotización. */
export const DESTINOS_POR_ESTADO: Record<EstadoOportunidad, readonly EstadoOportunidad[]> = {
  nueva: ["en_gestion", "ganada", "perdida"],
  en_gestion: ["ganada", "perdida"],
  cotizada: ["ganada", "perdida"],
  ganada: [],
  perdida: ["en_gestion"],
};
