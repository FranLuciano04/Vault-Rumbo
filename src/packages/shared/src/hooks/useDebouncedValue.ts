import { useEffect, useState } from "react";

/** Devuelve `valor` recién cuando pasaron `demoraMs` sin que cambie (p. ej. para no pedir en cada tecla). */
export function useDebouncedValue<T>(valor: T, demoraMs = 300): T {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setDemorado(valor);
    }, demoraMs);
    return () => {
      clearTimeout(temporizador);
    };
  }, [valor, demoraMs]);
  return demorado;
}
