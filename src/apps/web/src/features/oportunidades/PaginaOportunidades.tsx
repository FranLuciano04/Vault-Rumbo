import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
  type FiltrosOportunidades,
  type UsuarioActual,
} from "@rumbo/shared";
import { useOportunidadesPorPaginas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
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
  // Los filtros pueden llegar en la URL desde el dashboard (RF-128); un estado desconocido se ignora.
  const [parametros] = useSearchParams();
  const estadoDeUrl = ESTADOS.find((e) => e === parametros.get("estado"));
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["clave"]>(
    puedeFiltrarResponsable && parametros.get("mios") !== "true" ? "agencia" : "mias",
  );
  const [responsableId, setResponsableId] = useState(
    puedeFiltrarResponsable ? (parametros.get("responsable_id") ?? "") : "",
  );

  // «Mis oportunidades» pide `mios`; «Toda la agencia», sin `mios` (y con `responsable_id` si se elige uno).
  const filtros: FiltrosOportunidades =
    pestana === "mias" || esFreelance
      ? { mios: true }
      : responsableId
        ? { responsable_id: responsableId }
        : {};
  // Una consulta por estado: cada columna trae su `total` y sus páginas («Ver más»).
  // Con un estado en la URL solo se pide y se muestra esa columna.
  const useColumna = (estado: EstadoOportunidad) =>
    useOportunidadesPorPaginas(
      cliente,
      { ...filtros, estado },
      { enabled: !estadoDeUrl || estadoDeUrl === estado },
    );
  const consultas = (
    [
      { estado: "nueva", consulta: useColumna("nueva") },
      { estado: "en_gestion", consulta: useColumna("en_gestion") },
      { estado: "cotizada", consulta: useColumna("cotizada") },
      { estado: "ganada", consulta: useColumna("ganada") },
      { estado: "perdida", consulta: useColumna("perdida") },
    ] as const
  ).filter(({ estado }) => !estadoDeUrl || estadoDeUrl === estado);
  const cargando = consultas.some(({ consulta }) => consulta.isPending);
  const fallo = consultas.some(({ consulta }) => consulta.isError && !consulta.data);
  const actualizando = consultas.some(({ consulta }) => consulta.isPlaceholderData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Oportunidades</h1>
        <Link to="/oportunidades/nueva" className={variantesBoton()}>
          Nueva consulta
        </Link>
      </div>
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
          {consultas.map(({ estado, consulta }) => {
            const oportunidades = consulta.data?.pages.flatMap((p) => p.items) ?? [];
            return (
              <section key={estado} className="space-y-2 rounded-lg bg-muted/50 p-3">
                <h2 className="flex items-center justify-between text-sm font-semibold">
                  {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    {consulta.data?.pages[0]?.total}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {oportunidades.map((o) => (
                    <TarjetaOportunidad key={o.id} oportunidad={o} />
                  ))}
                </ul>
                {consulta.isFetchNextPageError && (
                  <p role="alert" className="text-xs text-destructive">
                    No pudimos traer más oportunidades.
                  </p>
                )}
                {consulta.hasNextPage && (
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
