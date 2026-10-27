import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
  type FiltrosOportunidades,
  type UsuarioActual,
} from "@rumbo/shared";
import { useOportunidades } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiltroResponsable } from "@/features/alertas/FiltroResponsable";
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
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["clave"]>("mias");
  const [responsableId, setResponsableId] = useState("");

  const filtros: FiltrosOportunidades = responsableId
    ? { responsable_id: responsableId }
    : pestana === "mias" || esFreelance
      ? { mios: true }
      : {};
  // Una consulta por estado: cada columna trae su `total` aunque la página no alcance a mostrarla entera.
  const consultas = [
    useOportunidades(cliente, { ...filtros, estado: "nueva" }),
    useOportunidades(cliente, { ...filtros, estado: "en_gestion" }),
    useOportunidades(cliente, { ...filtros, estado: "cotizada" }),
    useOportunidades(cliente, { ...filtros, estado: "ganada" }),
    useOportunidades(cliente, { ...filtros, estado: "perdida" }),
  ];
  const cargando = consultas.some((c) => c.isPending);
  const fallo = consultas.some((c) => c.isError);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Oportunidades</h1>
      {esFreelance && (
        <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
          Estás viendo solo tus clientes, oportunidades y viajes.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Vista" className="flex rounded-lg border bg-card p-1">
          {PESTANAS.filter(({ clave }) => !esFreelance || clave === "mias").map(
            ({ clave, etiqueta }) => (
              <Button
                key={clave}
                role="tab"
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
        {puedeFiltrarResponsable && (
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
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {ESTADOS.map((estado, i) => (
            <section key={estado} className="space-y-2 rounded-lg bg-muted/50 p-3">
              <h2 className="flex items-center justify-between text-sm font-semibold">
                {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}{" "}
                <span className="tabular-nums text-muted-foreground">
                  {consultas[i]?.data?.total}
                </span>
              </h2>
              <ul className="space-y-2">
                {consultas[i]?.data?.items.map((o) => (
                  <TarjetaOportunidad key={o.id} oportunidad={o} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
