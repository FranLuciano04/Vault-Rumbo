import { mensajeDeError, type CanalContenido } from "@rumbo/shared";
import { useContenidos } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ETIQUETA_CANAL } from "./etiquetas";

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const dos = (n: number) => String(n).padStart(2, "0");

/** Calendario mensual de publicaciones (RF-116); pide al backend solo el mes que se ve. */
export function CalendarioContenido({
  cliente,
  hoy,
  canal,
}: {
  cliente: AxiosInstance;
  /** Hoy, `aaaa-mm-dd`: el calendario abre en su mes. */
  hoy: string;
  canal?: CanalContenido;
}) {
  const [mes, setMes] = useState({
    anio: Number(hoy.slice(0, 4)),
    numero: Number(hoy.slice(5, 7)),
  });
  const primero = new Date(mes.anio, mes.numero - 1, 1);
  const diasDelMes = new Date(mes.anio, mes.numero, 0).getDate();
  const prefijo = `${String(mes.anio)}-${dos(mes.numero)}`;
  const { data, isPending, isPlaceholderData, isError, error } = useContenidos(cliente, {
    canal,
    desde: `${prefijo}-01`,
    hasta: `${prefijo}-${dos(diasDelMes)}`,
    por_pagina: 100,
  });
  // Lunes primero: getDay() devuelve 0 para el domingo.
  const huecos = (primero.getDay() + 6) % 7;
  const titulo = `${primero.toLocaleDateString("es-AR", { month: "long" })} ${String(mes.anio)}`;

  const irAlMes = (delta: number) => {
    const destino = new Date(mes.anio, mes.numero - 1 + delta, 1);
    setMes({ anio: destino.getFullYear(), numero: destino.getMonth() + 1 });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label="Mes anterior"
          onClick={() => {
            irAlMes(-1);
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 className="min-w-40 text-center text-lg font-semibold capitalize">{titulo}</h2>
        <Button
          variant="outline"
          size="sm"
          aria-label="Mes siguiente"
          onClick={() => {
            irAlMes(1);
          }}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      {(isPending || isPlaceholderData) && (
        <p role="status" aria-busy="true" className="text-sm text-muted-foreground">
          Cargando publicaciones…
        </p>
      )}
      {isError && <p role="alert">No pudimos cargar el calendario. {mensajeDeError(error)}</p>}
      <div
        aria-busy={isPlaceholderData}
        className={cn("grid grid-cols-7 gap-1 text-xs", isPlaceholderData && "opacity-60")}
      >
        {DIAS.map((dia) => (
          <p key={dia} className="px-1 font-medium text-muted-foreground uppercase">
            {dia}
          </p>
        ))}
        {Array.from({ length: huecos }, (_, i) => (
          <div key={`hueco-${String(i)}`} />
        ))}
        {Array.from({ length: diasDelMes }, (_, i) => {
          const dia = `${prefijo}-${dos(i + 1)}`;
          const piezas = data?.items.filter((pieza) => pieza.fecha_publicacion === dia) ?? [];
          return (
            <div key={dia} className="flex min-h-20 flex-col gap-1 rounded-md border p-1">
              <span className="text-muted-foreground">{i + 1}</span>
              {piezas.map((pieza) => {
                const publicada = pieza.estado_kanban === "publicado";
                return (
                  <article
                    key={pieza.id}
                    className={cn("rounded px-1 py-0.5", publicada ? "bg-emerald-50" : "bg-accent")}
                  >
                    <p>{pieza.titulo}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      {publicada && <Check aria-hidden="true" className="size-3" />}
                      {`${ETIQUETA_CANAL[pieza.canal]} · ${publicada ? "Publicada" : "Programada"}`}
                    </p>
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
