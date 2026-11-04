export type VistaCalendario = "mes" | "semana" | "dia";

const DIA_MS = 86_400_000;
const DIAS_SEMANA = 7;

/** Fecha ISO (`aaaa-mm-dd`) de un instante, en UTC: los días se manejan como fechas puras. */
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Cantidad de días desde el lunes (0 = lunes) del día `fecha`. */
const diasDesdeLunes = (fecha: string) =>
  (new Date(Date.parse(fecha)).getUTCDay() + 6) % DIAS_SEMANA;

/** Hoy según el reloj local, como `aaaa-mm-dd`. */
export function hoyIso(): string {
  const d = new Date();
  return iso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function sumarDias(fecha: string, dias: number): string {
  return iso(Date.parse(fecha) + dias * DIA_MS);
}

/** El día 1 del mes que está `meses` meses después del de `fecha`. */
function primerDiaDelMes(fecha: string, meses = 0): string {
  const d = new Date(Date.parse(fecha));
  return iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
}

/** Los días visibles de la vista que contiene a `ancla`, de a uno. */
export function diasDelPeriodo(vista: VistaCalendario, ancla: string): string[] {
  if (vista === "dia") return [ancla];
  if (vista === "semana") {
    const lunes = sumarDias(ancla, -diasDesdeLunes(ancla));
    return Array.from({ length: DIAS_SEMANA }, (_, i) => sumarDias(lunes, i));
  }
  const primero = primerDiaDelMes(ancla);
  const cantidad = (Date.parse(primerDiaDelMes(ancla, 1)) - Date.parse(primero)) / DIA_MS;
  return Array.from({ length: cantidad }, (_, i) => sumarDias(primero, i));
}

/** Mueve el ancla un período (mes, semana o día) hacia adelante o atrás. */
export function moverAncla(vista: VistaCalendario, ancla: string, sentido: 1 | -1): string {
  if (vista === "dia") return sumarDias(ancla, sentido);
  if (vista === "semana") return sumarDias(ancla, sentido * DIAS_SEMANA);
  return primerDiaDelMes(ancla, sentido);
}

/** Lugares en blanco antes del día 1 en una grilla que arranca los lunes. */
export const huecoInicial = diasDesdeLunes;
