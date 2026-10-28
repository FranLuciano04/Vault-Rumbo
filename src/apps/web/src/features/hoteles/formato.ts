/**
 * Precio de referencia en formato es-AR: la coma es el decimal (hasta 2 dígitos) y el punto agrupa
 * de a tres los miles. Hasta 12 dígitos enteros. Acepta «95000», «110.000», «95,50» y «1.420.000,50».
 */
export const PRECIO_ES_AR = /^(\d{1,12}|[1-9]\d{0,2}(\.\d{3}){1,3})(,\d{1,2})?$/;

/** El precio es-AR ya validado como decimal de la API: «110.000,50» pasa a «110000.50». */
export const precioParaLaApi = (texto: string) =>
  texto.trim().replaceAll(".", "").replace(",", ".");

/** El decimal de la API como se carga y se lee en es-AR: «110000.50» pasa a «110.000,50». */
export function precioParaMostrar(decimal: string): string {
  const [enteros = "", centavos] = decimal.split(".");
  const miles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return centavos && Number(centavos) !== 0 ? `${miles},${centavos}` : miles;
}

export const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
