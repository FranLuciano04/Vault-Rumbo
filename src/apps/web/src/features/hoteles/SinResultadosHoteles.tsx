import type { AlternativasHoteles } from "@rumbo/shared";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";

export type FiltroAmpliable = AlternativasHoteles["ampliar_filtros"][number];

const ETIQUETA_FILTRO: Record<FiltroAmpliable, string> = {
  destino_id: "destino",
  categoria: "categoría",
  precio_max: "precio máximo",
  servicio: "servicio",
};

/** Búsqueda sin hoteles (CU-18 A1, RF-110): filtros que se pueden quitar y, si corresponde, el alta. */
export function SinResultadosHoteles({
  alternativas,
  alQuitar,
  alLimpiar,
  permitirAlta = true,
}: {
  alternativas?: AlternativasHoteles | null;
  alQuitar: (filtro: FiltroAmpliable) => void;
  alLimpiar: () => void;
  /** Falso donde dar de alta sacaría al usuario de lo que está haciendo (p. ej. una cotización). */
  permitirAlta?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-6">
      <p className="font-medium">No encontramos hoteles con esos filtros.</p>
      <p className="text-sm text-muted-foreground">
        Probá ampliar la búsqueda quitando alguno de los filtros aplicados.
      </p>
      <div className="flex flex-wrap gap-2">
        {alternativas ? (
          <>
            {alternativas.ampliar_filtros.map((filtro) => (
              <Button
                key={filtro}
                variant="outline"
                onClick={() => {
                  alQuitar(filtro);
                }}
              >
                Quitar filtro: {ETIQUETA_FILTRO[filtro]}
              </Button>
            ))}
            {permitirAlta && alternativas.puede_dar_de_alta && (
              <Link to="/hoteles/nuevo" className={variantesBoton()}>
                Dar de alta un hotel
              </Link>
            )}
          </>
        ) : (
          <Button variant="outline" onClick={alLimpiar}>
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
