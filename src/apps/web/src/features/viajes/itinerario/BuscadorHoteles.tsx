import { formatearImporte, type Hotel } from "@rumbo/shared";
import { useHoteles } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Buscador de hoteles activos del catálogo para armar un tramo (CU-09). Un hotel que ya está en el
 * itinerario se puede volver a elegir (A5).
 */
export function BuscadorHoteles({
  cliente,
  destinoId,
  elegir,
  cancelar,
}: {
  cliente: AxiosInstance;
  /** Destino del viaje: el catálogo se acota a sus hoteles. */
  destinoId: string;
  elegir: (hotel: Hotel) => void;
  cancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const { data, isPending, isError } = useHoteles(cliente, {
    destino_id: destinoId,
    por_pagina: 100,
    orden: "nombre",
  });
  const hoteles = (data?.items ?? []).filter((h) =>
    h.nombre.toLowerCase().includes(texto.trim().toLowerCase()),
  );

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
      <Input
        type="search"
        aria-label="Buscar hotel"
        placeholder="Buscar hotel por nombre"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Podés repetir un hotel en tramos no consecutivos.
      </p>
      {isPending && <p role="status">Cargando hoteles…</p>}
      {isError && <p role="alert">No pudimos cargar el catálogo de hoteles.</p>}
      {data && hoteles.length === 0 && (
        <p className="text-sm">No hay hoteles activos que coincidan con la búsqueda.</p>
      )}
      <ul aria-label="Hoteles del catálogo" className="flex max-h-64 flex-col gap-2 overflow-auto">
        {hoteles.map((hotel) => (
          <li key={hotel.id}>
            <button
              type="button"
              aria-label={`Elegir ${hotel.nombre}`}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                elegir(hotel);
              }}
            >
              <span className="font-medium text-foreground">{hotel.nombre}</span>
              <span className="text-xs text-muted-foreground">
                {[
                  hotel.categoria,
                  hotel.precio_referencia &&
                    `${formatearImporte(hotel.precio_referencia, "ARS")} por noche`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {data && data.total > data.items.length && (
        <p className="text-sm">
          Hay más hoteles de los que se muestran: buscá por nombre para encontrar el que necesitás.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={cancelar}>
          Cancelar
        </Button>
        <Link to="/hoteles/nuevo" className={variantesBoton({ variant: "link" })}>
          ¿No está? Darlo de alta en el catálogo
        </Link>
      </div>
    </div>
  );
}
