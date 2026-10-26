import { useAlertas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";

/** El día anterior a una fecha ISO (`aaaa-mm-dd`). */
export function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Totales reales de la agenda (RF-074, RF-154), leídos del `total` del servidor con pedidos de una
 * sola alerta. Lo de hoy se pide con `desde` y `hasta` iguales a hoy.
 * Siguen al responsable filtrado (admin y dueño); sin filtro son los de la agencia o los propios.
 */
export function useTotalesAgenda(cliente: AxiosInstance, hoy: string, responsable: string) {
  const base = { por_pagina: 1, pagina: 1, ...(responsable && { propietario_id: responsable }) };
  const hastaHoy = useAlertas(cliente, { ...base, hasta: hoy }).data?.total;
  const atrasadas = useAlertas(cliente, { ...base, hasta: diaAnterior(hoy) }).data?.total;
  const deHoy = useAlertas(cliente, { ...base, desde: hoy, hasta: hoy }).data?.total;
  const proximas = useAlertas(cliente, { ...base, proximas: true }).data?.total;
  return {
    todas: hastaHoy,
    atrasadas,
    hoy: deHoy,
    proximas,
  };
}
