import type { Alerta } from "../modelos";
import { mensajeDeError } from "../errores";
import { useResolverAlerta } from "./alertas";
import type { AxiosInstance } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

/** Tiempo de gracia para tocar «Deshacer» antes de que la resolución llegue al servidor (RF-076). */
export const ESPERA_DESHACER_MS = 5_000;

interface Resuelta {
  alerta: Alerta;
  /** `true` cuando ya pasó el tiempo de gracia y el pedido salió. */
  enviada: boolean;
}

/**
 * Resolver con «Deshacer»: la alerta sale de la lista al instante, pero el POST se demora
 * `ESPERA_DESHACER_MS` y se cancela si se deshace. Si el servidor rechaza, la alerta vuelve y
 * queda el motivo en `error`. Al salir de la pantalla se envía lo que esté esperando.
 */
export function useResolverConDeshacer(cliente: AxiosInstance) {
  const { mutateAsync } = useResolverAlerta(cliente);
  const [resueltas, setResueltas] = useState<Resuelta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const esperando = useRef(
    new Map<string, { alerta: Alerta; temporizador: ReturnType<typeof setTimeout> }>(),
  );

  const quitar = (id: string) => {
    setResueltas((actuales) => actuales.filter((r) => r.alerta.id !== id));
  };

  const enviar = (alerta: Alerta) => {
    esperando.current.delete(alerta.id);
    setResueltas((actuales) =>
      actuales.map((r) => (r.alerta.id === alerta.id ? { ...r, enviada: true } : r)),
    );
    mutateAsync(alerta.id)
      .catch((falla: unknown) => {
        setError(mensajeDeError(falla));
      })
      .finally(() => {
        quitar(alerta.id);
      });
  };
  const enviarRef = useRef(enviar);
  useEffect(() => {
    enviarRef.current = enviar;
  });

  /** Envía ya lo que está esperando el tiempo de gracia (al irse de la pantalla o de la app). */
  const enviarPendientes = useCallback(() => {
    for (const { alerta, temporizador } of esperando.current.values()) {
      clearTimeout(temporizador);
      enviarRef.current(alerta);
    }
  }, []);

  useEffect(() => enviarPendientes, [enviarPendientes]);

  return {
    /** Las alertas resueltas que la lista no tiene que mostrar (esperando o recién enviadas). */
    resueltas,
    error,
    enviarPendientes,
    limpiarError: () => {
      setError(null);
    },
    resolver: (alerta: Alerta) => {
      setError(null);
      setResueltas((actuales) => [...actuales, { alerta, enviada: false }]);
      esperando.current.set(alerta.id, {
        alerta,
        temporizador: setTimeout(() => {
          enviar(alerta);
        }, ESPERA_DESHACER_MS),
      });
    },
    deshacer: (id: string) => {
      clearTimeout(esperando.current.get(id)?.temporizador);
      esperando.current.delete(id);
      quitar(id);
    },
  };
}
