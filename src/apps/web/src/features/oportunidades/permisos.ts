import type { Oportunidad, UsuarioActual } from "@rumbo/shared";

/** Escribe sobre la oportunidad quien es responsable, admin o dueño; el resto solo lee (la API lo hace valer igual). */
export const puedeEscribirOportunidad = (usuario: UsuarioActual, oportunidad: Oportunidad) =>
  usuario.rol === "admin" || usuario.rol === "dueno" || usuario.id === oportunidad.responsable_id;

/** Una oportunidad está abierta mientras no se ganó ni se perdió. */
export const oportunidadAbierta = (oportunidad: Oportunidad) =>
  oportunidad.estado !== "ganada" && oportunidad.estado !== "perdida";
