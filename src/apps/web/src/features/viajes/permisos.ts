import type { UsuarioActual, Viaje } from "@rumbo/shared";

/** Opera el viaje quien es responsable, admin o dueño; el resto solo lee (la API lo hace valer igual). */
export const puedeEscribirViaje = (usuario: UsuarioActual, viaje: Viaje) =>
  usuario.rol === "admin" || usuario.rol === "dueno" || usuario.id === viaje.responsable_id;

/**
 * Un viaje finalizado o cancelado ya no se edita. Es más estricta que la API a propósito (H-03): la API
 * admite tocar el itinerario de un finalizado y registrar o revertir cobros en viajes cerrados.
 */
export const viajeEditable = (viaje: Viaje) =>
  viaje.estado !== "finalizado" && viaje.estado !== "cancelado";

/** Plan, cobros e itinerario: quien escribe sobre el viaje, mientras siga editable. */
export const puedeOperarViaje = (usuario: UsuarioActual, viaje: Viaje) =>
  puedeEscribirViaje(usuario, viaje) && viajeEditable(viaje);

/** La economía sigue la misma regla, salvo el freelance, que la ve en solo lectura (pantalla 43). */
export const puedeEditarEconomia = (usuario: UsuarioActual, viaje: Viaje) =>
  usuario.rol !== "freelance" && puedeOperarViaje(usuario, viaje);
