import { formatearFecha } from "@rumbo/shared";
import { useRestaurarResena, useResenas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { PaginadorResenas } from "./PaginadorResenas";

/** Reseñas ocultas con su motivo y la acción de restaurarlas (CU-29; solo admin y dueña, RF-111). */
export function ResenasOcultas({ cliente, hotelId }: { cliente: AxiosInstance; hotelId: string }) {
  const [pagina, setPagina] = useState(1);
  const { data, isError, error } = useResenas(cliente, hotelId, { estado: "oculta", pagina });
  const restaurar = useRestaurarResena(cliente);
  if (isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        No pudimos cargar las reseñas ocultas. {mensajeDeError(error)}
      </p>
    );
  if (!data || (data.total === 0 && data.items.length === 0)) return null;
  return (
    <section aria-labelledby="titulo-ocultas" className="flex flex-col gap-3">
      <h2 id="titulo-ocultas" className="text-lg font-semibold">
        Reseñas ocultas
      </h2>
      {restaurar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mensajeDeError(restaurar.error)}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {data.items.map((resena) => (
          <li key={resena.id} className="flex flex-col gap-2 rounded-2xl border bg-muted p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{resena.puntaje}</span>
              <span className="text-muted-foreground">{formatearFecha(resena.fecha)}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                disabled={restaurar.isPending}
                onClick={() => {
                  restaurar.mutate(resena.id);
                }}
              >
                Restaurar reseña
              </Button>
            </div>
            <p>{resena.comentario}</p>
            <p className="text-sm text-muted-foreground">Motivo: {resena.motivo_baja}</p>
          </li>
        ))}
      </ul>
      <PaginadorResenas
        pagina={pagina}
        total={data.total}
        porPagina={data.por_pagina}
        alCambiar={setPagina}
      />
    </section>
  );
}
