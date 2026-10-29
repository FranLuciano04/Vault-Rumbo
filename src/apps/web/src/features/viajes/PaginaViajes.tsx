import {
  ETIQUETA_ESTADO_VIAJE,
  type EstadoViaje,
  type FiltrosViajes,
  type UsuarioActual,
} from "@rumbo/shared";
import { useClientes, useDestinos, useViajes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TablaViajes } from "./TablaViajes";

const ESTADOS = Object.keys(ETIQUETA_ESTADO_VIAJE) as EstadoViaje[];
const PESTANAS = [
  { clave: "mios", etiqueta: "Mis viajes" },
  { clave: "agencia", etiqueta: "Toda la agencia" },
] as const;

/**
 * Listado de viajes (CU-08, pantallas 14 y 42). El freelance solo recibe lo suyo, por decisión de
 * la API: no ve «Toda la agencia».
 */
export function PaginaViajes({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const esFreelance = usuario.rol === "freelance";
  const puedeVerAgencia = usuario.rol === "admin" || usuario.rol === "dueno";
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["clave"]>(
    puedeVerAgencia ? "agencia" : "mios",
  );
  const [filtros, setFiltros] = useState<FiltrosViajes>({ pagina: 1 });

  const { data, isPending, isError, isPlaceholderData } = useViajes(cliente, {
    ...filtros,
    ...(pestana === "mios" || esFreelance ? { mios: true } : {}),
  });
  const { data: clientes } = useClientes(cliente, { por_pagina: 100 });
  const { data: destinos } = useDestinos(cliente, { por_pagina: 100 });

  // Todo cambio de filtro vuelve a la primera página.
  const filtrar = (cambios: FiltrosViajes) => {
    setFiltros((f) => ({ ...f, ...cambios, pagina: 1 }));
  };
  const pagina = filtros.pagina ?? 1;
  const ultima = data ? Math.max(1, Math.ceil(data.total / data.por_pagina)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Operaciones
        </p>
        <h1 className="text-3xl font-semibold">Viajes</h1>
      </header>

      {esFreelance && (
        <p
          role="note"
          className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <Eye aria-hidden="true" className="size-4 shrink-0" />
          Estás viendo solo tus viajes: los que tenés asignados.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {!esFreelance && (
          <div role="tablist" aria-label="Vista" className="flex rounded-lg border bg-card p-1">
            {PESTANAS.map(({ clave, etiqueta }) => (
              <Button
                key={clave}
                role="tab"
                aria-selected={pestana === clave}
                variant={pestana === clave ? "default" : "ghost"}
                onClick={() => {
                  setPestana(clave);
                  setFiltros((f) => ({ ...f, pagina: 1 }));
                }}
              >
                {etiqueta}
              </Button>
            ))}
          </div>
        )}
        {ESTADOS.map((estado) => (
          <Button
            key={estado}
            size="sm"
            className="rounded-full"
            variant={filtros.estado === estado ? "default" : "outline"}
            aria-pressed={filtros.estado === estado}
            onClick={() => {
              filtrar({ estado: filtros.estado === estado ? undefined : estado });
            }}
          >
            {ETIQUETA_ESTADO_VIAJE[estado]}
          </Button>
        ))}
        <div className="flex flex-col gap-1">
          <Label htmlFor="salida-desde">Salida desde</Label>
          <Input
            id="salida-desde"
            type="date"
            value={filtros.desde ?? ""}
            onChange={(e) => {
              filtrar({ desde: e.target.value || undefined });
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="salida-hasta">Salida hasta</Label>
          <Input
            id="salida-hasta"
            type="date"
            value={filtros.hasta ?? ""}
            onChange={(e) => {
              filtrar({ hasta: e.target.value || undefined });
            }}
          />
        </div>
      </div>

      {isPending && <p role="status">Cargando viajes…</p>}
      {isError && <p role="alert">No pudimos cargar los viajes. Probá de nuevo en unos minutos.</p>}
      {data && !isError && (
        <div
          aria-busy={isPlaceholderData}
          className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
        >
          {data.items.length === 0 ? (
            <p>No se encontraron viajes.</p>
          ) : (
            <div className="rounded-2xl border bg-card p-2">
              <TablaViajes
                viajes={data.items}
                nombreDestino={(id) => destinos?.items.find((d) => d.id === id)?.nombre}
                nombreCliente={(id) => clientes?.items.find((c) => c.id === id)?.nombre}
              />
              <div className="flex items-center justify-between px-3 py-4 text-sm text-muted-foreground">
                <span>
                  Mostrando {data.items.length} de {data.total} viajes
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pagina <= 1 || isPlaceholderData}
                    onClick={() => {
                      setFiltros((f) => ({ ...f, pagina: pagina - 1 }));
                    }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pagina >= ultima || isPlaceholderData}
                    onClick={() => {
                      setFiltros((f) => ({ ...f, pagina: pagina + 1 }));
                    }}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
