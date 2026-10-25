import type { Alerta } from "@rumbo/shared";
import { useResolverAlerta } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useRef, useState } from "react";
import { mensajeDeError } from "@/lib/errores";

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

  useEffect(() => {
    const pendientes = esperando.current;
    return () => {
      for (const { alerta, temporizador } of pendientes.values()) {
        clearTimeout(temporizador);
        enviarRef.current(alerta);
      }
    };
  }, []);

  return {
    /** Las alertas resueltas que la lista no tiene que mostrar (esperando o recién enviadas). */
    resueltas,
    error,
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
