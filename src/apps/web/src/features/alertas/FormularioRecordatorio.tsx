import type { Alerta } from "@rumbo/shared";
import type { AxiosInstance } from "axios";

/** Entidad a la que queda asociado un recordatorio nuevo (CU-28): una sola, ya elegida por quien lo abre. */
export interface AsociadoRecordatorio {
  tipo: "cliente" | "oportunidad" | "viaje";
  id: string;
  etiqueta: string;
}

export interface PropiedadesFormularioRecordatorio {
  cliente: AxiosInstance;
  /** Alta asociada (p. ej. desde la ficha de un cliente); sin esto el recordatorio es personal. */
  asociado?: AsociadoRecordatorio;
  /** Si viene, el formulario edita ese recordatorio manual pendiente. */
  alerta?: Alerta;
  alCerrar: () => void;
  alGuardar?: (alerta: Alerta) => void;
}

/** Alta y edición de un recordatorio manual (CU-28, pantalla 6). */
export function FormularioRecordatorio(_props: PropiedadesFormularioRecordatorio): never {
  throw new Error("no implementado");
}
