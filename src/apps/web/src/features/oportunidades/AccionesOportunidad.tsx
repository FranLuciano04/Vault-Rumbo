import type { EstadoOportunidad, Oportunidad } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarGanar, FormularioPerder } from "./ConfirmacionesCierre";
import { useTransicionesOportunidad } from "./useTransicionesOportunidad";

/** Acciones que admite cada estado (EST-Oportunidad). */
const ADMITE: Record<
  EstadoOportunidad,
  { enGestion: boolean; ganar: boolean; perder: boolean; reactivar: boolean }
> = {
  nueva: { enGestion: true, ganar: true, perder: true, reactivar: false },
  en_gestion: { enGestion: false, ganar: true, perder: true, reactivar: false },
  cotizada: { enGestion: false, ganar: true, perder: true, reactivar: false },
  ganada: { enGestion: false, ganar: false, perder: false, reactivar: false },
  perdida: { enGestion: false, ganar: false, perder: false, reactivar: true },
};

/** Cambios de estado de la oportunidad (RF-016, RF-017, RF-020); los 409 se explican con el `detail` de la API. */
export function AccionesOportunidad({
  cliente,
  oportunidad,
}: {
  cliente: AxiosInstance;
  oportunidad: Oportunidad;
}) {
  const transiciones = useTransicionesOportunidad(cliente);
  const [paso, setPaso] = useState<"ganar" | "perder" | null>(null);
  const admite = ADMITE[oportunidad.estado];
  const { pendiente, error } = transiciones;
  const cerrarSiSalioBien = (salioBien: boolean) => {
    if (salioBien) setPaso(null);
  };

  return (
    <section aria-label="Acciones" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {admite.enGestion && (
          <Button
            variant="outline"
            disabled={pendiente}
            onClick={() => void transiciones.tomar(oportunidad.id)}
          >
            Pasar a en gestión
          </Button>
        )}
        {admite.ganar && paso !== "ganar" && (
          <Button
            disabled={pendiente}
            onClick={() => {
              setPaso("ganar");
            }}
          >
            Ganar
          </Button>
        )}
        {admite.perder && paso !== "perder" && (
          <Button
            variant="outline"
            disabled={pendiente}
            onClick={() => {
              setPaso("perder");
            }}
          >
            Perder
          </Button>
        )}
        {admite.reactivar && (
          <Button disabled={pendiente} onClick={() => void transiciones.reactivar(oportunidad.id)}>
            Reactivar
          </Button>
        )}
      </div>
      {admite.ganar && paso === "ganar" && (
        <ConfirmarGanar
          pendiente={pendiente}
          alConfirmar={() => void transiciones.ganar(oportunidad.id).then(cerrarSiSalioBien)}
          alCancelar={() => {
            setPaso(null);
          }}
        />
      )}
      {admite.perder && paso === "perder" && (
        <FormularioPerder
          pendiente={pendiente}
          alConfirmar={(datos) =>
            void transiciones.perder(oportunidad.id, datos).then(cerrarSiSalioBien)
          }
          alCancelar={() => {
            setPaso(null);
          }}
        />
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
