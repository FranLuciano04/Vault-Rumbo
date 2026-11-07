import { type CanalContenido, type EstadoKanban } from "@rumbo/shared";
import { useContenidosPorPaginas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { COLUMNAS } from "./etiquetas";

const POR_PAGINA = 20;

export type ConsultaColumna = ReturnType<typeof useContenidosPorPaginas>;

export interface ColumnaTablero {
  estado: EstadoKanban;
  etiqueta: string;
  consulta: ConsultaColumna;
}

/**
 * Una consulta por columna del tablero (RF-114), cada una con su total y sus páginas («Ver más»),
 * y la de descartadas (RF-117), que solo se pide si se la quiere ver. La API lista de la fecha de
 * publicación más próxima a la más lejana y no admite otro orden: en Publicado las más viejas salen
 * primero y las recientes quedan tras «Ver más».
 */
export function useTableroContenido(
  cliente: AxiosInstance,
  {
    canal,
    activo,
    verDescartadas,
  }: { canal?: CanalContenido; activo: boolean; verDescartadas: boolean },
) {
  const useColumna = (estado: EstadoKanban, habilitada: boolean) =>
    useContenidosPorPaginas(
      cliente,
      { canal, estado_kanban: estado, por_pagina: POR_PAGINA },
      { enabled: activo && habilitada },
    );
  const tablero = activo && !verDescartadas;
  const consultas: Record<EstadoKanban, ConsultaColumna> = {
    idea: useColumna("idea", tablero),
    en_produccion: useColumna("en_produccion", tablero),
    listo: useColumna("listo", tablero),
    publicado: useColumna("publicado", tablero),
    descartado: useColumna("descartado", verDescartadas),
  };

  const columnas: ColumnaTablero[] = COLUMNAS.map(({ estado, etiqueta }) => ({
    estado,
    etiqueta,
    consulta: consultas[estado],
  }));
  const descartadas: ColumnaTablero = {
    estado: "descartado",
    etiqueta: "Descartadas",
    consulta: consultas.descartado,
  };
  return verDescartadas ? [descartadas] : columnas;
}
