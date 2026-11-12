import type { OportunidadPerder } from "@rumbo/shared";
import {
  useGanarOportunidad,
  usePerderOportunidad,
  useReactivarOportunidad,
  useTomarOportunidad,
} from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { mensajeDeError } from "@/lib/errores";

/**
 * Cambios de estado de una oportunidad (RF-016, RF-017, RF-020), compartidos por el detalle y el embudo.
 * Cada acción devuelve si salió bien; si falla, `error` trae el `detail` de la API (los 409 se explican solos).
 */
export function useTransicionesOportunidad(cliente: AxiosInstance) {
  const tomar = useTomarOportunidad(cliente);
  const ganar = useGanarOportunidad(cliente);
  const perder = usePerderOportunidad(cliente);
  const reactivar = useReactivarOportunidad(cliente);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);
    try {
      await accion();
      return true;
    } catch (falla) {
      setError(mensajeDeError(falla));
      return false;
    }
  }

  return {
    error,
    pendiente: tomar.isPending || ganar.isPending || perder.isPending || reactivar.isPending,
    tomar: (oportunidadId: string) => ejecutar(() => tomar.mutateAsync(oportunidadId)),
    ganar: (oportunidadId: string, cotizacionId?: string) =>
      ejecutar(() =>
        ganar.mutateAsync({ oportunidadId, ...(cotizacionId && { cotizacion_id: cotizacionId }) }),
      ),
    reactivar: (oportunidadId: string) => ejecutar(() => reactivar.mutateAsync(oportunidadId)),
    perder: (oportunidadId: string, datos: OportunidadPerder) =>
      ejecutar(() => perder.mutateAsync({ oportunidadId, datos })),
  };
}
