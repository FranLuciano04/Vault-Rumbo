import {
  formatearImporte,
  formatearPuntaje,
  mensajeDeError,
  type UsuarioActual,
} from "@rumbo/shared";
import { useHotel, useResenas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Star } from "lucide-react";
import { Link } from "react-router";
import { variantesBoton } from "@/components/ui/button";
import { ResenaPublicada } from "./ResenaPublicada";
import { ResenasOcultas } from "./ResenasOcultas";

/**
 * Detalle del hotel con sus reseñas (CU-18 paso 3, pantallas 24, 45 y 48). Admin y dueña moderan
 * (CU-29); freelance y empleado solo leen: la API además rechaza lo que su rol no puede ver.
 */
export function DetalleHotel({
  cliente,
  usuario,
  hotelId,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  hotelId: string;
}) {
  const puedeModerar = usuario.rol === "admin" || usuario.rol === "dueno";
  const hotel = useHotel(cliente, hotelId);
  const resenas = useResenas(cliente, hotelId);
  if (hotel.isPending) return <p role="status">Cargando hotel…</p>;
  if (hotel.isError)
    return <p role="alert">No pudimos cargar el hotel. {mensajeDeError(hotel.error)}</p>;
  const { data } = hotel;
  return (
    <div className="flex flex-col gap-6">
      <Link to="/hoteles" className={variantesBoton({ variant: "link", className: "self-start" })}>
        Volver a hoteles
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{data.nombre}</h1>
        {data.categoria && <p className="text-muted-foreground">{data.categoria}</p>}
        <p className="flex items-center gap-1 text-sm">
          {data.cantidad_resenas > 0 && data.puntaje_promedio ? (
            <>
              <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{formatearPuntaje(data.puntaje_promedio)}</span>
              <span className="text-muted-foreground">
                · {data.cantidad_resenas} {data.cantidad_resenas === 1 ? "reseña" : "reseñas"}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Sin reseñas</span>
          )}
        </p>
        {data.servicios.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {data.servicios.map((servicio) => (
              <li key={servicio} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {servicio}
              </li>
            ))}
          </ul>
        )}
        {data.precio_referencia && (
          <p className="text-sm">
            <span className="font-semibold">{formatearImporte(data.precio_referencia, "ARS")}</span>{" "}
            <span className="text-muted-foreground">por noche</span>
          </p>
        )}
      </header>
      <section aria-labelledby="titulo-resenas" className="flex flex-col gap-3">
        <h2 id="titulo-resenas" className="text-lg font-semibold">
          Reseñas
        </h2>
        {resenas.isError && (
          <p role="alert">No pudimos cargar las reseñas. {mensajeDeError(resenas.error)}</p>
        )}
        <ul className="flex flex-col gap-3">
          {resenas.data?.items.map((resena) => (
            <ResenaPublicada
              key={resena.id}
              cliente={cliente}
              resena={resena}
              puedeModerar={puedeModerar}
            />
          ))}
        </ul>
      </section>
      {puedeModerar && <ResenasOcultas cliente={cliente} hotelId={hotelId} />}
    </div>
  );
}
