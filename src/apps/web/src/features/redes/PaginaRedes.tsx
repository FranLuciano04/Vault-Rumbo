import { ErrorApi, hoyEnBuenosAires, mensajeDeError, type ContenidoRed } from "@rumbo/shared";
import { useContenidos } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarioContenido } from "./CalendarioContenido";
import { FormularioContenido } from "./FormularioContenido";
import { TableroContenido } from "./TableroContenido";

type Vista = "tablero" | "calendario";
const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: "tablero", etiqueta: "Tablero" },
  { id: "calendario", etiqueta: "Calendario" },
];

/**
 * Planificación de contenido para redes (CU-19, RF-113 a RF-117): tablero kanban y calendario.
 * El acceso lo decide la API: sin permiso (403) se muestra el aviso y ningún dato.
 */
export function PaginaRedes({ cliente }: { cliente: AxiosInstance }) {
  const [vista, setVista] = useState<Vista>("tablero");
  // `undefined` = sin formulario; `null` = alta; una pieza = edición.
  const [edicion, setEdicion] = useState<ContenidoRed | null | undefined>();
  const { data, isPending, isError, error } = useContenidos(cliente, { por_pagina: 100 });

  if (error instanceof ErrorApi && error.status === 403) {
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
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Redes</p>
          <h1 className="text-3xl font-semibold">Contenido para redes</h1>
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

      <div role="tablist" aria-label="Vista" className="flex gap-2">
        {VISTAS.map(({ id, etiqueta }) => (
          <Button
            key={id}
            role="tab"
            aria-selected={vista === id}
            variant={vista === id ? "default" : "outline"}
            onClick={() => {
              setVista(id);
            }}
          >
            {etiqueta}
          </Button>
        ))}
      </div>

      {vista === "calendario" ? (
        <CalendarioContenido cliente={cliente} hoy={hoyEnBuenosAires()} />
      ) : (
        <>
          {isPending && <p role="status">Cargando contenido…</p>}
          {isError && <p role="alert">No pudimos cargar el tablero. {mensajeDeError(error)}</p>}
          {data && (
            <TableroContenido
              cliente={cliente}
              piezas={data.items}
              alEditar={(pieza) => {
                setEdicion(pieza);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
