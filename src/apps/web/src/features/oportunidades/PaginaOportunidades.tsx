import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
  type FiltrosOportunidades,
  type UsuarioActual,
} from "@rumbo/shared";
import { useOportunidadesPorPaginas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FiltroResponsable } from "@/components/FiltroResponsable";
import { TarjetaOportunidad } from "./TarjetaOportunidad";

const ESTADOS = Object.keys(ETIQUETA_ESTADO_OPORTUNIDAD) as EstadoOportunidad[];
const PESTANAS = [
  { clave: "mias", etiqueta: "Mis oportunidades" },
  { clave: "agencia", etiqueta: "Toda la agencia" },
] as const;

/**
 * Embudo de oportunidades (CU-05, pantallas 12 y 34): una columna por estado con el total del
 * servidor. El freelance solo recibe lo suyo, por decisión de la API: no ve «Toda la agencia».
 */
export function PaginaOportunidades({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const esFreelance = usuario.rol === "freelance";
  const puedeFiltrarResponsable = usuario.rol === "admin" || usuario.rol === "dueno";
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["clave"]>(
    puedeFiltrarResponsable ? "agencia" : "mias",
  );
  const [responsableId, setResponsableId] = useState("");

  // «Mis oportunidades» pide `mios`; «Toda la agencia», sin `mios` (y con `responsable_id` si se elige uno).
  const filtros: FiltrosOportunidades =
    pestana === "mias" || esFreelance
      ? { mios: true }
      : responsableId
        ? { responsable_id: responsableId }
        : {};
  // Una consulta por estado: cada columna trae su `total` y sus páginas («Ver más»).
  const consultas = [
    useOportunidadesPorPaginas(cliente, { ...filtros, estado: "nueva" }),
    useOportunidadesPorPaginas(cliente, { ...filtros, estado: "en_gestion" }),
    useOportunidadesPorPaginas(cliente, { ...filtros, estado: "cotizada" }),
    useOportunidadesPorPaginas(cliente, { ...filtros, estado: "ganada" }),
    useOportunidadesPorPaginas(cliente, { ...filtros, estado: "perdida" }),
  ];
  const cargando = consultas.some((c) => c.isPending);
  const fallo = consultas.some((c) => c.isError && !c.data);
  const actualizando = consultas.some((c) => c.isPlaceholderData);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Oportunidades</h1>
      {esFreelance && (
        <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
          Estás viendo solo tus clientes, oportunidades y viajes. El catálogo de hoteles, destinos y
          operadores es compartido.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Vista" className="flex rounded-lg border bg-card p-1">
          {PESTANAS.filter(({ clave }) => !esFreelance || clave === "mias").map(
            ({ clave, etiqueta }) => (
              <Button
                key={clave}
                id={`pestana-${clave}`}
                role="tab"
                aria-controls="panel-embudo"
                aria-selected={pestana === clave}
                variant={pestana === clave ? "default" : "ghost"}
                onClick={() => {
                  setPestana(clave);
                  setResponsableId("");
                }}
              >
                {etiqueta}
              </Button>
            ),
          )}
        </div>
        {puedeFiltrarResponsable && pestana === "agencia" && (
          <FiltroResponsable cliente={cliente} valor={responsableId} alCambiar={setResponsableId} />
        )}
      </div>

      {fallo ? (
        <p role="alert" className="text-sm text-destructive">
          No pudimos cargar el embudo. Probá de nuevo en un momento.
        </p>
      ) : cargando ? (
        <p role="status" aria-busy="true" className="text-sm text-muted-foreground">
          Cargando oportunidades…
        </p>
      ) : (
        <div
          id="panel-embudo"
          role="tabpanel"
          aria-labelledby={`pestana-${pestana}`}
          aria-busy={actualizando}
          className={cn(
            "grid gap-4 md:grid-cols-3 xl:grid-cols-5",
            actualizando && "opacity-70 transition-opacity",
          )}
        >
          {ESTADOS.map((estado, i) => {
            const consulta = consultas[i];
            const oportunidades = consulta?.data?.pages.flatMap((p) => p.items) ?? [];
            return (
              <section key={estado} className="space-y-2 rounded-lg bg-muted/50 p-3">
                <h2 className="flex items-center justify-between text-sm font-semibold">
                  {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    {consulta?.data?.pages[0]?.total}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {oportunidades.map((o) => (
                    <TarjetaOportunidad key={o.id} oportunidad={o} />
                  ))}
                </ul>
                {consulta?.isFetchNextPageError && (
                  <p role="alert" className="text-xs text-destructive">
                    No pudimos traer más oportunidades.
                  </p>
                )}
                {consulta?.hasNextPage && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    disabled={consulta.isFetchingNextPage}
                    onClick={() => void consulta.fetchNextPage()}
                  >
                    Ver más
                  </Button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
