/** Fecha de negocio `YYYY-MM-DD` como `dd/mm/aa` (RNF-16). */
export function formatearFecha(fecha: string): string {
  const [anio = "", mes = "", dia = ""] = fecha.split("-");
  return `${dia}/${mes}/${anio.slice(-2)}`;
}
