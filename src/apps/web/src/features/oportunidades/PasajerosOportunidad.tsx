import { textoPasajeros } from "@rumbo/shared";

/** Pasajeros de una consulta; si faltan se ve «—» y se anuncia «Pasajeros sin definir» (DEC-0023). */
export function PasajerosOportunidad({ pasajeros }: { pasajeros: number | null }) {
  if (pasajeros === null) {
    return (
      <span role="img" aria-label="Pasajeros sin definir">
        {textoPasajeros(pasajeros)}
      </span>
    );
  }
  return <>{textoPasajeros(pasajeros)}</>;
}
