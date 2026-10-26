import { useRef } from "react";

/**
 * Para un formulario que se abre y se cierra: `recordar` guarda quién tenía el foco al abrirlo
 * (el botón que lo abrió) y `volver` se lo devuelve al cerrarlo.
 */
export function useVolverFoco() {
  const origen = useRef<Element | null>(null);
  return {
    recordar: () => {
      origen.current = document.activeElement;
    },
    /** Descarta el origen guardado, cuando el elemento que lo tenía ya no existe. */
    olvidar: () => {
      origen.current = null;
    },
    volver: () => {
      if (origen.current instanceof HTMLElement) origen.current.focus();
      origen.current = null;
    },
  };
}
