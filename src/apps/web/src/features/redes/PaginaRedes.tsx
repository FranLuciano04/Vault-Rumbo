import {
  hoyEnBuenosAires,
  mensajeDeError,
  type CanalContenido,
  type ContenidoRed,
} from "@rumbo/shared";
import { canalesContenido } from "@rumbo/shared/esquemas";
import type { AxiosInstance } from "axios";
import { Plus, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarioContenido } from "./CalendarioContenido";
import { ETIQUETA_CANAL } from "./etiquetas";
import { FormularioContenido } from "./FormularioContenido";
import { esSinAcceso } from "./sinAcceso";
import { TableroContenido } from "./TableroContenido";
import { useTableroContenido } from "./useTableroContenido";

type Vista = "tablero" | "calendario";
const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: "tablero", etiqueta: "Tablero" },
  { id: "calendario", etiqueta: "Calendario" },
];

/**
 * Planificación de contenido para redes (CU-19, RF-113 a RF-117): tablero kanban y calendario.
 * El acceso lo decide la API (DEC-0008, DEC-0013): sin permiso (403) se muestra el aviso y ningún dato.
 */
export function PaginaRedes({ cliente }: { cliente: AxiosInstance }) {
  const [vista, setVista] = useState<Vista>("tablero");
  const [canal, setCanal] = useState<CanalContenido>();
  const [verDescartadas, setVerDescartadas] = useState(false);
  // El calendario avisa si su lectura da 403; el tablero se lee directo de sus consultas.
  const [calendarioSinAcceso, setCalendarioSinAcceso] = useState(false);
  // `undefined` = sin formulario; `null` = alta; una pieza = edición.
  const [edicion, setEdicion] = useState<ContenidoRed | null | undefined>();
  const enTablero = vista === "tablero";
  const columnas = useTableroContenido(cliente, {
    canal,
    activo: enTablero,
    verDescartadas,
  });
  const cargando = columnas.some(({ consulta }) => consulta.isPending);
  // Un 403 corta la pantalla aunque haya datos (una relectura puede perder el acceso); los demás
  // errores solo tumban el tablero si no hay nada que mostrar.
  const sinAcceso =
    calendarioSinAcceso || columnas.some(({ consulta }) => esSinAcceso(consulta.error));
  const falla = columnas.find(({ consulta }) => consulta.isError && !consulta.data)?.consulta.error;

  if (sinAcceso) {
    return (
      <p role="alert" className="p-6">
        No tenés acceso al módulo de redes. Pedíselo a quien administra la agencia.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Marketing y análisis
          </p>
          <h1 className="text-3xl font-semibold">Contenido en redes</h1>
        </div>
        <Button
          onClick={() => {
            setEdicion(null);
          }}
        >
          <Plus aria-hidden="true" />
          Nueva pieza
        </Button>
      </header>

      {edicion !== undefined && (
        <FormularioContenido
          key={edicion?.id ?? "nueva"}
          cliente={cliente}
          pieza={edicion ?? undefined}
          alCerrar={() => {
            setEdicion(undefined);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Vista" className="flex rounded-lg border bg-card p-1">
          {VISTAS.map(({ id, etiqueta }) => (
            <Button
              key={id}
              role="tab"
              aria-selected={vista === id}
              variant={vista === id ? "default" : "ghost"}
              onClick={() => {
                setVista(id);
              }}
            >
              {etiqueta}
            </Button>
          ))}
        </div>
        <div role="group" aria-label="Filtrar por red" className="flex gap-2">
          {canalesContenido.map((opcion) => (
            <Button
              key={opcion}
              size="sm"
              className="rounded-full"
              variant={canal === opcion ? "default" : "outline"}
              aria-pressed={canal === opcion}
              onClick={() => {
                setCanal(canal === opcion ? undefined : opcion);
              }}
            >
              {ETIQUETA_CANAL[opcion]}
            </Button>
          ))}
        </div>
        {enTablero && (
          <button
            type="button"
            role="switch"
            aria-checked={verDescartadas}
            className="ml-auto flex items-center gap-2 text-sm text-muted-foreground"
            onClick={() => {
              setVerDescartadas(!verDescartadas);
            }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                verDescartadas ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full bg-background transition-transform",
                  verDescartadas && "translate-x-4",
                )}
              />
            </span>
            Mostrar descartadas
          </button>
        )}
      </div>

      {enTablero ? (
        <>
          {cargando && <p role="status">Cargando contenido…</p>}
          {falla !== undefined && falla !== null && (
            <p role="alert">No pudimos cargar el tablero. {mensajeDeError(falla)}</p>
          )}
          {!cargando && (
            <TableroContenido
              cliente={cliente}
              columnas={columnas}
              soloLectura={verDescartadas}
              alEditar={(pieza) => {
                setEdicion(pieza);
              }}
            />
          )}
        </>
      ) : (
        <CalendarioContenido
          cliente={cliente}
          hoy={hoyEnBuenosAires()}
          canal={canal}
          alSinAcceso={() => {
            setCalendarioSinAcceso(true);
          }}
        />
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Share2 aria-hidden="true" className="size-3.5 shrink-0" />
        Rumbo no publica en las redes: después de publicar a mano, pasá la pieza a «Publicado». Las
        piezas descartadas se conservan.
      </p>
    </div>
  );
}
