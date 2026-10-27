import { ETIQUETA_ESTADO_COTIZACION, formatearFecha, formatearImporte } from "@rumbo/shared";
import { useCotizaciones } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";

const POR_PAGINA = 100;

/** Versiones de las cotizaciones de la oportunidad (RF-024), de la más reciente a la más antigua. */
export function VersionesCotizacion({
  cliente,
  oportunidadId,
}: {
  cliente: AxiosInstance;
  oportunidadId: string;
}) {
  const consulta = useCotizaciones(cliente, oportunidadId, { por_pagina: POR_PAGINA });
  const pagina = consulta.data;
  const anteriores = pagina ? pagina.total - pagina.items.length : 0;

  return (
    <section aria-labelledby="titulo-versiones" className="space-y-3">
      <h2 id="titulo-versiones" className="text-lg font-semibold">
        Versiones
      </h2>
      {consulta.isError ? (
        <p role="alert" className="text-sm text-destructive">
          No pudimos cargar las cotizaciones de la oportunidad.
        </p>
      ) : !pagina ? (
        <p aria-busy="true" className="text-sm text-muted-foreground">
          Cargando cotizaciones…
        </p>
      ) : pagina.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cotizaciones.</p>
      ) : (
        <>
          <ul aria-label="Versiones de la cotización" className="space-y-2">
            {pagina.items.map((cotizacion, i) => (
              <li
                key={cotizacion.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm"
              >
                <span>
                  Versión {pagina.total - i} · {formatearFecha(cotizacion.fecha)} ·{" "}
                  {formatearImporte(cotizacion.total, cotizacion.moneda)}
                </span>
                <span className="text-muted-foreground">
                  Válida hasta {formatearFecha(cotizacion.validez_hasta)}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {ETIQUETA_ESTADO_COTIZACION[cotizacion.estado]}
                </span>
              </li>
            ))}
          </ul>
          {anteriores > 0 && (
            <p className="text-sm text-muted-foreground">
              y {anteriores} {anteriores === 1 ? "versión anterior" : "versiones anteriores"}
            </p>
          )}
        </>
      )}
    </section>
  );
}
