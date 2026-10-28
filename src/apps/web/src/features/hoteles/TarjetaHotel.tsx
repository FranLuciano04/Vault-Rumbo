import { formatearImporte, formatearPuntaje, type Hotel } from "@rumbo/shared";
import { Star } from "lucide-react";
import { Link } from "react-router";

/** Tarjeta del catálogo (CU-18, pantallas 21 y 44): datos del hotel y su puntaje por reseñas. */
export function TarjetaHotel({ hotel, destino }: { hotel: Hotel; destino?: string }) {
  const { puntaje_promedio: puntaje, cantidad_resenas: resenas } = hotel;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">
          <Link to={`/hoteles/${hotel.id}`} className="hover:underline">
            {hotel.nombre}
          </Link>
        </h2>
        <p className="text-sm text-muted-foreground">
          {[destino, hotel.categoria].filter(Boolean).join(" · ")}
        </p>
      </div>
      <p className="flex items-center gap-1 text-sm">
        {puntaje ? (
          <>
            <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{formatearPuntaje(puntaje)}</span>
            <span className="text-muted-foreground">
              · {resenas} {resenas === 1 ? "reseña" : "reseñas"}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Sin reseñas</span>
        )}
      </p>
      {hotel.servicios.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {hotel.servicios.map((servicio) => (
            <li key={servicio} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
              {servicio}
            </li>
          ))}
        </ul>
      )}
      {hotel.precio_referencia && (
        <p className="mt-auto text-sm">
          <span className="font-semibold">{formatearImporte(hotel.precio_referencia, "ARS")}</span>{" "}
          <span className="text-muted-foreground">por noche</span>
        </p>
      )}
    </li>
  );
}
