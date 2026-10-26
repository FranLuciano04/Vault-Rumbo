import type { Alerta, FiltrosAlertas, TipoAlerta } from "@rumbo/shared";
import { useAlertas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";

/** El día anterior a una fecha ISO (`aaaa-mm-dd`). */
export function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface FiltrosDeTotales {
  responsable: string;
  tipo: TipoAlerta | "";
  /** Con «Mostrar vistas» activo, cada total suma también las vistas. */
  conVistas: boolean;
  /** Resueltas que esperan el «Deshacer»: la lista ya no las muestra, así que no se cuentan. */
  resueltas: Alerta[];
}

function useTotalDelRango(
  cliente: AxiosInstance,
  { conVistas, resueltas, ...filtros }: FiltrosDeTotales,
  rango: FiltrosAlertas,
  cuenta: (alerta: Alerta) => boolean,
) {
  const base: FiltrosAlertas = {
    por_pagina: 1,
    pagina: 1,
    ...(filtros.responsable && { propietario_id: filtros.responsable }),
    ...(filtros.tipo && { tipo: filtros.tipo }),
    ...rango,
  };
  const pendientes = useAlertas(cliente, base).data?.total;
  const vistas = useAlertas(cliente, { ...base, estado: "vista" }, { enabled: conVistas }).data
    ?.total;
  if (pendientes === undefined || (conVistas && vistas === undefined)) return undefined;
  const enEspera = resueltas.filter(
    (a) => cuenta(a) && (conVistas || a.estado === "pendiente"),
  ).length;
  return pendientes + (conVistas ? (vistas ?? 0) : 0) - enEspera;
}

/**
 * Totales reales de la agenda (RF-074, RF-154): el `total` del servidor, con pedidos de una sola
 * alerta, de lo mismo que mostraría la lista de cada pestaña con los filtros activos (responsable,
 * tipo y vistas). Lo de hoy se pide con `desde` y `hasta` iguales a hoy; «Todas» es la suma de
 * atrasadas y de hoy.
 */
export function useTotalesAgenda(cliente: AxiosInstance, hoy: string, filtros: FiltrosDeTotales) {
  const atrasadas = useTotalDelRango(
    cliente,
    filtros,
    { hasta: diaAnterior(hoy) },
    (a) => a.fecha < hoy,
  );
  const deHoy = useTotalDelRango(
    cliente,
    filtros,
    { desde: hoy, hasta: hoy },
    (a) => a.fecha === hoy,
  );
  const proximas = useTotalDelRango(cliente, filtros, { proximas: true }, (a) => a.fecha > hoy);
  return {
    todas: atrasadas !== undefined && deHoy !== undefined ? atrasadas + deHoy : undefined,
    atrasadas,
    hoy: deHoy,
    proximas,
  };
}
