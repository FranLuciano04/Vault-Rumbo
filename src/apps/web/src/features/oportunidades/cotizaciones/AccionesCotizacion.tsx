import type { Cotizacion } from "@rumbo/shared";
import {
  descargarDocumentoCotizacion,
  useAceptarCotizacion,
  useEnviarCotizacion,
  useRechazarCotizacion,
} from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ERROR_AL_GUARDAR, mensajeDeError } from "@/lib/errores";

const ERROR_AL_DESCARGAR = "No pudimos descargar el PDF. Probá de nuevo en unos minutos.";

/** Descarga el PDF de la versión mediante un enlace temporal. */
async function guardarPdf(cliente: AxiosInstance, cotizacion: Cotizacion) {
  const url = URL.createObjectURL(await descargarDocumentoCotizacion(cliente, cotizacion.id));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `cotizacion-${cotizacion.id}.pdf`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Acciones de una versión (RF-023, RF-025): descargar el PDF y, si puede responder, marcarla como
 * enviada o registrar la respuesta del cliente. Rechazar pide confirmación; los 409 muestran el `detail`.
 */
export function AccionesCotizacion({
  cliente,
  cotizacion,
  puedeResponder,
}: {
  cliente: AxiosInstance;
  cotizacion: Cotizacion;
  puedeResponder: boolean;
}) {
  const enviar = useEnviarCotizacion(cliente);
  const aceptar = useAceptarCotizacion(cliente);
  const rechazar = useRechazarCotizacion(cliente);
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendiente = enviar.isPending || aceptar.isPending || rechazar.isPending || descargando;
  const puedeResponderBorrador = puedeResponder && cotizacion.estado === "borrador";
  const puedeResponderEnviada = puedeResponder && cotizacion.estado === "enviada";

  async function ejecutar(accion: () => Promise<unknown>, respaldo?: string) {
    setError(null);
    try {
      await accion();
      setConfirmandoRechazo(false);
    } catch (falla) {
      const mensaje = mensajeDeError(falla);
      setError(mensaje === ERROR_AL_GUARDAR && respaldo ? respaldo : mensaje);
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pendiente}
        onClick={() => {
          setDescargando(true);
          void ejecutar(() => guardarPdf(cliente, cotizacion), ERROR_AL_DESCARGAR).finally(() => {
            setDescargando(false);
          });
        }}
      >
        <Download aria-hidden="true" />
        Descargar PDF
      </Button>
      {puedeResponderBorrador && (
        <Button
          size="sm"
          disabled={pendiente}
          onClick={() => void ejecutar(() => enviar.mutateAsync(cotizacion.id))}
        >
          Marcar como enviada
        </Button>
      )}
      {puedeResponderEnviada && !confirmandoRechazo && (
        <>
          <Button
            size="sm"
            disabled={pendiente}
            onClick={() => void ejecutar(() => aceptar.mutateAsync(cotizacion.id))}
          >
            Aceptar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente}
            onClick={() => {
              setConfirmandoRechazo(true);
            }}
          >
            Rechazar
          </Button>
        </>
      )}
      {puedeResponderEnviada && confirmandoRechazo && (
        <div role="group" aria-label="Rechazar la cotización" className="flex items-center gap-2">
          <span className="text-sm">¿Confirmás que el cliente rechazó la cotización?</span>
          <Button
            size="sm"
            disabled={pendiente}
            onClick={() => void ejecutar(() => rechazar.mutateAsync(cotizacion.id))}
          >
            Confirmar rechazo
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente}
            onClick={() => {
              setConfirmandoRechazo(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
