import { respuestaProblema } from "./problema";

/** Un campo del cuerpo y su regla; devuelve el mensaje de error o `null` si el valor es válido. */
export type Campo = {
  regla: (valor: unknown) => string | null;
  /** Se puede omitir (campo con valor por defecto, o campo `omitible()` de un PATCH). */
  opcional?: boolean;
  /** Admite `null` explícito; si no, un `null` pasa por la regla y da 422. */
  anulable?: boolean;
};

export type ErrorCampo = { campo: string; mensaje: string };

/** Obligatorio y sin `null`. */
export const requerido = (regla: Campo["regla"]): Campo => ({ regla });
/** Se puede omitir, pero un `null` explícito da 422 (`omitible()` de `Edicion`). */
export const omitible = (regla: Campo["regla"]): Campo => ({ regla, opcional: true });
/** Se puede omitir o mandar en `null` (campo anulable con valor por defecto). */
export const anulable = (regla: Campo["regla"]): Campo => ({
  regla,
  opcional: true,
  anulable: true,
});

/** Reglas de los tipos de Pydantic que usan los esquemas del backend. */
export const reglas = {
  texto: (min: number, max: number) => (valor: unknown) => {
    if (typeof valor !== "string") return "Input should be a valid string";
    if (valor.length < min)
      return `String should have at least ${String(min)} character${min > 1 ? "s" : ""}`;
    if (valor.length > max) return `String should have at most ${String(max)} characters`;
    return null;
  },
  entero: (minimo: number) => (valor: unknown) => {
    if (typeof valor !== "number" || !Number.isInteger(valor))
      return "Input should be a valid integer";
    return valor < minimo ? `Input should be greater than or equal to ${String(minimo)}` : null;
  },
  booleano: (valor: unknown) =>
    typeof valor === "boolean" ? null : "Input should be a valid boolean",
  unoDe: (valores: readonly string[]) => (valor: unknown) =>
    typeof valor === "string" && valores.includes(valor)
      ? null
      : `Input should be ${valores.map((v) => `'${v}'`).join(", ")}`,
  patron: (patron: RegExp, max: number) => (valor: unknown) =>
    reglas.texto(1, max)(valor) ??
    (patron.test(valor as string) ? null : `String should match pattern '${patron.source}'`),
};

/**
 * Valida el cuerpo como lo haría el esquema Pydantic: un error por campo, con su `campo` y su
 * `mensaje`. `entreCampos` es el `model_validator`: corre solo si los campos son válidos y su
 * error va en el campo `body`, como en `_error_campo` del backend. Devuelve el 422 problem+json
 * con `errores`, o `null` si el cuerpo es válido.
 */
export function validar(
  cuerpo: Record<string, unknown>,
  campos: Record<string, Campo>,
  entreCampos?: (cuerpo: Record<string, unknown>) => string | null,
) {
  const errores: ErrorCampo[] = [];
  for (const [campo, { regla, opcional, anulable: admiteNull }] of Object.entries(campos)) {
    const valor = cuerpo[campo];
    if (valor === undefined) {
      if (!opcional) errores.push({ campo, mensaje: "Field required" });
    } else if (valor !== null || !admiteNull) {
      const mensaje = regla(valor);
      if (mensaje) errores.push({ campo, mensaje });
    }
  }
  const cruzado = errores.length === 0 ? entreCampos?.(cuerpo) : null;
  if (cruzado) errores.push({ campo: "body", mensaje: cruzado });
  return errores.length === 0
    ? null
    : respuestaProblema(422, "Datos inválidos", {
        detail: "Los datos enviados no son válidos.",
        errores,
      });
}
