import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  CobroRegistrar,
  EconomiaRegistrada,
  EconomiaViaje,
  Pago,
  PagoDividir,
  PagoReprogramar,
  PlanDePagos,
} from "../modelos";
import { claveAlertas } from "./alertas";
import { useAccion } from "./useAccion";
import { claveViajes } from "./viajes";

// Los pagos cuelgan de la ficha del viaje (saldo, estado) y generan alertas de vencimiento: toda
// mutación invalida `viajes` y, salvo la economía, también `alertas`.

/** Plan de pagos y checklist del viaje (`GET /api/viajes/{viaje_id}/pagos`, CU-11, CU-12). */
export function usePagos(cliente: AxiosInstance, viajeId: string) {
  return useQuery({
    queryKey: [...claveViajes, viajeId, "pagos"],
    enabled: Boolean(viajeId),
    queryFn: async () => (await cliente.get<Pago[]>(`/api/viajes/${viajeId}/pagos`)).data,
  });
}

/** Registra la economía del viaje (`PUT /api/viajes/{viaje_id}/economia`, CU-10). */
export function useRegistrarEconomia(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ viajeId, datos }: { viajeId: string; datos: EconomiaViaje }) =>
      (await cliente.put<EconomiaRegistrada>(`/api/viajes/${viajeId}/economia`, datos)).data,
  );
}

/** Define o rebalancea el plan de pagos (`PUT /api/viajes/{viaje_id}/pagos`, CU-11). */
export function useDefinirPlanDePagos(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ viajeId, datos }: { viajeId: string; datos: PlanDePagos }) =>
      (await cliente.put<Pago[]>(`/api/viajes/${viajeId}/pagos`, datos)).data,
    [claveAlertas],
  );
}

/** Reprograma el vencimiento de un pago (`PATCH /api/pagos/{pago_id}`, CU-11). */
export function useReprogramarPago(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ pagoId, datos }: { pagoId: string; datos: PagoReprogramar }) =>
      (await cliente.patch<Pago>(`/api/pagos/${pagoId}`, datos)).data,
    [claveAlertas],
  );
}

/** Anula un pago (`POST /api/pagos/{pago_id}/anular`, CU-11). */
export function useAnularPago(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async (pagoId: string) => (await cliente.post<Pago>(`/api/pagos/${pagoId}/anular`)).data,
    [claveAlertas],
  );
}

/** Divide un pago para cobrar una parte (`POST /api/pagos/{pago_id}/dividir`, CU-11). */
export function useDividirPago(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ pagoId, datos }: { pagoId: string; datos: PagoDividir }) =>
      (await cliente.post<Pago[]>(`/api/pagos/${pagoId}/dividir`, datos)).data,
    [claveAlertas],
  );
}

/** Registra el cobro de un pago (`POST /api/pagos/{pago_id}/cobrar`, CU-12); puede mover el estado del viaje. */
export function useRegistrarCobro(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ pagoId, datos }: { pagoId: string; datos: CobroRegistrar }) =>
      (await cliente.post<Pago>(`/api/pagos/${pagoId}/cobrar`, datos)).data,
    [claveAlertas],
  );
}

/** Revierte un cobro cargado por error (`POST /api/pagos/{pago_id}/revertir-cobro`, CU-12). */
export function useRevertirCobro(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async (pagoId: string) =>
      (await cliente.post<Pago>(`/api/pagos/${pagoId}/revertir-cobro`)).data,
    [claveAlertas],
  );
}
