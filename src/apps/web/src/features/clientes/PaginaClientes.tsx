import type { SegmentoCliente, UsuarioActual } from "@rumbo/shared";
import { useClientes, type FiltrosClientes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Eye, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { cn } from "@/lib/utils";
import { FiltroEtiquetas } from "./FiltroEtiquetas";
import { ETIQUETA_SEGMENTO } from "./segmentos";
import { TablaClientes } from "./TablaClientes";

const SEGMENTOS = Object.keys(ETIQUETA_SEGMENTO) as SegmentoCliente[];

/**
 * Listado de clientes (CU-03, pantallas 8 y 39). El freelance solo recibe los suyos, por decisión
 * de la API: no ve el selector de vista.
 */
export function PaginaClientes({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const esFreelance = usuario.rol === "freelance";
  const [filtros, setFiltros] = useState<FiltrosClientes>(
    esFreelance ? { pagina: 1 } : { pagina: 1, mios: true },
  );
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const buscar = useDebouncedValue(textoBusqueda.trim() || undefined);
  const { data, isPending, isError, isPlaceholderData } = useClientes(cliente, filtros);

  // Todo cambio de filtro vuelve a la primera página.
  const filtrar = (cambios: FiltrosClientes) => {
    setFiltros((f) => ({ ...f, ...cambios, pagina: 1 }));
  };
  const irAPagina = (pagina: number) => {
    setFiltros((f) => ({ ...f, pagina }));
  };

  // La búsqueda ya demorada pasa a los filtros (ajuste de estado durante el render, sin efecto).
  if (buscar !== filtros.buscar) filtrar({ buscar });

  // La navegación parte de la página pedida, no de la del dato (que es la vieja mientras llega la nueva).
  const pagina = filtros.pagina ?? 1;
  const ultima = data ? Math.max(1, Math.ceil(data.total / data.por_pagina)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Comercial
          </p>
          <h1 className="text-3xl font-semibold">Clientes</h1>
        </div>
        <div className="relative w-80">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Buscar por nombre, teléfono o email"
            placeholder="Buscar por nombre, teléfono o email"
            className="pl-9"
            value={textoBusqueda}
            onChange={(e) => {
              setTextoBusqueda(e.target.value);
            }}
          />
        </div>
      </header>

      {esFreelance && (
        <p
          role="note"
          className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <Eye aria-hidden="true" className="size-4 shrink-0" />
          Estás viendo solo tus clientes: los que tenés como asesor asignado. Los clientes que das
          de alta quedan a tu nombre.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {esFreelance ? (
          <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Mis clientes
          </span>
        ) : (
          <div className="flex rounded-lg border bg-card p-1">
            {[
              { etiqueta: "Mis clientes", mios: true },
              { etiqueta: "Toda la agencia", mios: false },
            ].map(({ etiqueta, mios }) => (
              <Button
                key={etiqueta}
                variant={filtros.mios === mios ? "default" : "ghost"}
                aria-pressed={filtros.mios === mios}
                onClick={() => {
                  filtrar({ mios });
                }}
              >
                {etiqueta}
              </Button>
            ))}
          </div>
        )}
        {SEGMENTOS.map((segmento) => (
          <Button
            key={segmento}
            size="sm"
            className="rounded-full"
            variant={filtros.segmento === segmento ? "default" : "outline"}
            aria-pressed={filtros.segmento === segmento}
            onClick={() => {
              filtrar({ segmento: filtros.segmento === segmento ? undefined : segmento });
            }}
          >
            {ETIQUETA_SEGMENTO[segmento]}
          </Button>
        ))}
        <FiltroEtiquetas
          cliente={cliente}
          elegidas={filtros.etiquetas ?? []}
          alCambiar={(etiquetas) => {
            filtrar({ etiquetas: etiquetas.length > 0 ? etiquetas : undefined });
          }}
        />
      </div>

      {isPending && <p role="status">Cargando clientes…</p>}
      {isError && (
        <p role="alert">No pudimos cargar los clientes. Probá de nuevo en unos minutos.</p>
      )}
      <div
        aria-busy={isPlaceholderData}
        className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
      >
        {data && data.items.length === 0 && !isPlaceholderData && (
          <p>No se encontraron clientes.</p>
        )}
        {data && data.items.length > 0 && (
          <div className="rounded-2xl border bg-card p-2">
            <TablaClientes clientes={data.items} />
            <div className="flex items-center justify-between px-3 py-4 text-sm text-muted-foreground">
              <span>
                Mostrando {data.items.length} de {data.total} clientes
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pagina <= 1 || isPlaceholderData}
                  onClick={() => {
                    irAPagina(pagina - 1);
                  }}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={pagina >= ultima || isPlaceholderData}
                  onClick={() => {
                    irAPagina(pagina + 1);
                  }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
