import type { Cotizacion, ReservaConfirmada } from "@rumbo/shared";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

type Motivo = ReservaConfirmada["advertencias_itinerario"][number]["motivo"];

const MOTIVO: Record<Motivo, string> = {
  fuera_de_fechas: "queda fuera de las fechas del viaje",
  superpuesto: "se superpone con otro tramo del itinerario",
  hotel_cerrado: "el hotel está cerrado",
};

/**
 * Aviso de los hoteles de la cotización que no entraron al itinerario al confirmar la reserva
 * (CU-07 A4, RF-036). El viaje ya se creó: el botón lleva a su ficha.
 */
export function AvisoHotelesOmitidos({
  reserva,
  aceptada,
}: {
  reserva: ReservaConfirmada;
  aceptada?: Cotizacion;
}) {
  const navegar = useNavigate();
  const nombreDelHotel = (hotelId: string) =>
    aceptada?.items.find((item) => item.hotel_id === hotelId)?.concepto ?? "Un hotel";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div role="alert" className="flex flex-col gap-2 text-sm">
        <p className="font-medium">
          La reserva se confirmó, pero algunos hoteles no entraron al itinerario:
        </p>
        <ul className="list-disc pl-5">
          {reserva.advertencias_itinerario.map((advertencia) => (
            <li key={advertencia.hotel_id}>
              {nombreDelHotel(advertencia.hotel_id)}: {MOTIVO[advertencia.motivo]}.
            </li>
          ))}
        </ul>
      </div>
      <Button
        className="self-start"
        onClick={() => {
          void navegar(`/viajes/${reserva.id}`);
        }}
      >
        Ir al viaje
      </Button>
    </div>
  );
}
