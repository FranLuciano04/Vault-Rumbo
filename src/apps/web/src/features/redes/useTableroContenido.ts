import { hoyEnBuenosAires, type CanalContenido, type EstadoKanban } from "@rumbo/shared";
import { useContenidosPorPaginas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { COLUMNAS } from "./etiquetas";

const POR_PAGINA = 20;
/** La API lista de la fecha más próxima a la más lejana y no admite otro orden: para que las
 * publicadas recientes no queden al final de una lista larga, la columna trae solo las últimas. */
const DIAS_DE_PUBLICADAS = 30;

const dos = (n: number) => String(n).padStart(2, "0");

function haceDias(hoy: string, dias: number): string {
  const fecha = new Date(`${hoy}T12:00:00`);
  fecha.setDate(fecha.getDate() - dias);
  return `${String(fecha.getFullYear())}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export type ConsultaColumna = ReturnType<typeof useContenidosPorPaginas>;

export interface ColumnaTablero {
  estado: EstadoKanban;
  etiqueta: string;
  consulta: ConsultaColumna;
  nota?: string;
}

/**
 * Una consulta por columna del tablero (RF-114), cada una con su total y sus páginas («Ver más»),
 * y la de descartadas (RF-117), que solo se pide si se la quiere ver.
 */
export function useTableroContenido(
  cliente: AxiosInstance,
  {
    canal,
    activo,
    verDescartadas,
  }: { canal?: CanalContenido; activo: boolean; verDescartadas: boolean },
) {
  const hoy = hoyEnBuenosAires();
  const useColumna = (estado: EstadoKanban, habilitada: boolean, extra = {}) =>
    useContenidosPorPaginas(
      cliente,
      { canal, estado_kanban: estado, por_pagina: POR_PAGINA, ...extra },
      { enabled: activo && habilitada },
    );
  const tablero = activo && !verDescartadas;
  const consultas: Record<EstadoKanban, ConsultaColumna> = {
    idea: useColumna("idea", tablero),
    en_produccion: useColumna("en_produccion", tablero),
    listo: useColumna("listo", tablero),
    publicado: useColumna("publicado", tablero, { desde: haceDias(hoy, DIAS_DE_PUBLICADAS) }),
    descartado: useColumna("descartado", verDescartadas),
  };

  const columnas: ColumnaTablero[] = COLUMNAS.map(({ estado, etiqueta }) => ({
    estado,
    etiqueta,
    consulta: consultas[estado],
    ...(estado === "publicado" && {
      nota: `Se muestran las de los últimos ${String(DIAS_DE_PUBLICADAS)} días.`,
    }),
  }));
  const descartadas: ColumnaTablero = {
    estado: "descartado",
    etiqueta: "Descartadas",
    consulta: consultas.descartado,
  };
  return verDescartadas ? [descartadas] : columnas;
}
