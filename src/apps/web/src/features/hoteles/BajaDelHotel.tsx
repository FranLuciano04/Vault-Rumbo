import type { Hotel } from "@rumbo/shared";
import { useDarDeBajaHotel } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";

/** Baja del hotel (RF-100) con confirmación: el foco entra en «Cancelar» y vuelve a «Dar de baja». */
export function BajaDelHotel({ cliente, hotel }: { cliente: AxiosInstance; hotel: Hotel }) {
  const darDeBaja = useDarDeBajaHotel(cliente);
  const navegar = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const botonBaja = useRef<HTMLButtonElement>(null);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const botonCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmando) botonCancelar.current?.focus();
  }, [confirmando]);

  // Si la baja falla, el foco vuelve al botón (ya habilitado de nuevo).
  useEffect(() => {
    if (darDeBaja.isError) botonBaja.current?.focus();
  }, [darDeBaja.isError]);

  function cerrar() {
    setConfirmando(false);
    botonBaja.current?.focus();
  }

  function confirmar() {
    setConfirmando(false);
    darDeBaja.mutate(hotel.id, {
      onSuccess: () => {
        void navegar("/hoteles");
      },
    });
  }

  return (
    <section aria-label="Baja del hotel" className="flex flex-col gap-3">
      <Button
        ref={botonBaja}
        variant="outline"
        className="self-start"
        disabled={darDeBaja.isPending}
        onClick={() => {
          setConfirmando(true);
        }}
      >
        Dar de baja
      </Button>
      {confirmando && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={`Dar de baja ${hotel.nombre}`}
          className="flex max-w-md flex-col gap-3 rounded-md border p-4 text-sm"
          onKeyDown={(evento) => {
            if (evento.key === "Escape") cerrar();
            // El foco queda atrapado entre «Confirmar» y «Cancelar» mientras el diálogo está abierto.
            if (evento.key === "Tab") {
              const salida = evento.shiftKey ? botonConfirmar.current : botonCancelar.current;
              if (document.activeElement === salida) {
                evento.preventDefault();
                (evento.shiftKey ? botonCancelar : botonConfirmar).current?.focus();
              }
            }
          }}
        >
          <p>
            ¿Dar de baja «{hotel.nombre}»? El hotel deja de ofrecerse en el catálogo y no se puede
            editar; sus reseñas se conservan.
          </p>
          <div className="flex gap-2">
            <Button ref={botonConfirmar} onClick={confirmar}>
              Confirmar
            </Button>
            <Button ref={botonCancelar} variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {darDeBaja.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensajeDeError(darDeBaja.error)}
        </p>
      )}
    </section>
  );
}
