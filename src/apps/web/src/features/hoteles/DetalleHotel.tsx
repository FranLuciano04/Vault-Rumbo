import { formatearImporte, formatearPuntaje, type UsuarioActual } from "@rumbo/shared";
import { useDestinos, useHotel, useResenas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Eye, Pencil, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { BajaDelHotel } from "./BajaDelHotel";
import { FormularioResena } from "./FormularioResena";
import { PaginadorResenas } from "./PaginadorResenas";
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
  const puedeRegistrar = usuario.rol !== "freelance";
  const [registrando, setRegistrando] = useState(false);
  const hotel = useHotel(cliente, hotelId);
  const [pagina, setPagina] = useState(1);
  const resenas = useResenas(cliente, hotelId, { pagina });
  const { data: destinos } = useDestinos(cliente, { por_pagina: 100 });
  const cerrarAlta = () => {
    setRegistrando(false);
  };
  if (hotel.isPending) return <p role="status">Cargando hotel…</p>;
  if (hotel.isError)
    return <p role="alert">No pudimos cargar el hotel. {mensajeDeError(hotel.error)}</p>;
  const { data } = hotel;
  const puedeEditar = usuario.rol !== "freelance" && data.estado !== "cerrado";
  const destino = destinos?.items.find((d) => d.id === data.destino_id)?.nombre;
  return (
    <div className="flex flex-col gap-6">
      <Link to="/hoteles" className={variantesBoton({ variant: "link", className: "self-start" })}>
        Volver a hoteles
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{data.nombre}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {data.estado === "cerrado" ? "Cerrado" : "Activo"}
          </span>
          {puedeEditar && (
            <Link
              to={`/hoteles/${hotelId}/editar`}
              className={variantesBoton({ variant: "outline", className: "ml-auto" })}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Editar
            </Link>
          )}
        </div>
        {puedeEditar && <BajaDelHotel cliente={cliente} hotel={data} />}
        {usuario.rol === "freelance" && (
          <p
            role="note"
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <Eye aria-hidden="true" className="size-4 shrink-0" />
            Solo consulta: podés leer los hoteles y sus reseñas. El alta de hoteles y el registro de
            reseñas los hacen empleados y administración.
          </p>
        )}
        {data.estado === "cerrado" && (
          <p role="note" className="rounded-xl bg-muted px-4 py-3 text-sm">
            Este hotel está cerrado.
          </p>
        )}
        <p className="text-muted-foreground">
          {[destino, data.categoria].filter(Boolean).join(" · ")}
        </p>
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
        <div className="flex items-center justify-between gap-2">
          <h2 id="titulo-resenas" className="text-lg font-semibold">
            Reseñas
          </h2>
          {puedeRegistrar && !registrando && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setRegistrando(true);
              }}
            >
              Nueva reseña
            </Button>
          )}
        </div>
        {registrando && (
          <FormularioResena
            cliente={cliente}
            hotelId={hotelId}
            alTerminar={cerrarAlta}
            alCancelar={cerrarAlta}
          />
        )}
        {resenas.isError && (
          <p role="alert">No pudimos cargar las reseñas. {mensajeDeError(resenas.error)}</p>
        )}
        {resenas.isPending && <p role="status">Cargando reseñas…</p>}
        {resenas.data?.total === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay reseñas publicadas.</p>
        )}
        <ul className="flex flex-col gap-3">
          {resenas.data?.items.map((resena) => (
            <ResenaPublicada
              key={resena.id}
              cliente={cliente}
              resena={resena}
              puedeModerar={puedeModerar}
              puedeEditar={puedeRegistrar}
            />
          ))}
        </ul>
        {resenas.data && (
          <PaginadorResenas
            pagina={pagina}
            total={resenas.data.total}
            porPagina={resenas.data.por_pagina}
            alCambiar={setPagina}
          />
        )}
      </section>
      {puedeModerar && <ResenasOcultas cliente={cliente} hotelId={hotelId} />}
    </div>
  );
}
