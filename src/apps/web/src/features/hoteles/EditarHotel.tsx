import type { Hotel, HotelEditar, UsuarioActual } from "@rumbo/shared";
import { useDarDeBajaHotel, useEditarHotel, useHotel } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { FormularioHotel, type DatosHotel } from "./FormularioHotel";

/** Solo los campos que cambiaron respecto del hotel; `servicios` viaja completo si cambió alguno. */
function cambiosDelHotel(
  { nombre, destino_id, categoria, precio_referencia, servicios }: DatosHotel,
  hotel: Hotel,
): HotelEditar {
  const cambios: HotelEditar = {};
  if (nombre !== hotel.nombre) cambios.nombre = nombre;
  if (destino_id !== hotel.destino_id) cambios.destino_id = destino_id;
  if ((categoria || null) !== hotel.categoria) cambios.categoria = categoria || null;
  if ((precio_referencia || null) !== hotel.precio_referencia) {
    cambios.precio_referencia = precio_referencia || null;
  }
  const mismosServicios =
    servicios.length === hotel.servicios.length &&
    servicios.every((servicio) => hotel.servicios.includes(servicio));
  if (!mismosServicios) cambios.servicios = servicios;
  return cambios;
}

/** Edición y baja de un hotel del catálogo (CU-16, RF-098, RF-100, pantalla 23). Lee `:id` de la ruta. */
export function EditarHotel({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  if (usuario.rol === "freelance") return <Navigate to="/hoteles" replace />;
  return <EdicionDelHotel cliente={cliente} />;
}

function EdicionDelHotel({ cliente }: { cliente: AxiosInstance }) {
  const { id = "" } = useParams();
  const { data: hotel, isError } = useHotel(cliente, id);
  const editar = useEditarHotel(cliente);
  const darDeBaja = useDarDeBajaHotel(cliente);
  const navegar = useNavigate();
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  function confirmarBaja() {
    setConfirmandoBaja(false);
    darDeBaja.mutate(id, {
      onSuccess: () => {
        void navegar("/hoteles");
      },
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Hoteles</p>
        <h1 className="text-3xl font-semibold">Editar hotel</h1>
      </header>
      {isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar el hotel. Probá de nuevo en unos minutos.
        </p>
      )}
      {hotel && (
        <>
          <FormularioHotel
            key={hotel.id}
            cliente={cliente}
            hotel={hotel}
            textoEnviar="Guardar cambios"
            enviar={async (datos) => {
              const cambios = cambiosDelHotel(datos, hotel);
              if (Object.keys(cambios).length > 0) {
                await editar.mutateAsync({ hotelId: hotel.id, cambios });
              }
              void navegar("/hoteles");
            }}
          />
          {hotel.estado !== "cerrado" && (
            <section aria-label="Baja del hotel" className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="self-start"
                disabled={darDeBaja.isPending}
                onClick={() => {
                  setConfirmandoBaja(true);
                }}
              >
                Dar de baja
              </Button>
              {confirmandoBaja && (
                <div
                  role="alertdialog"
                  aria-label={`Dar de baja ${hotel.nombre}`}
                  className="flex max-w-md flex-col gap-3 rounded-md border p-4 text-sm"
                >
                  <p>
                    ¿Dar de baja «{hotel.nombre}»? El hotel deja de ofrecerse en el catálogo y no se
                    puede editar; sus reseñas se conservan.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={confirmarBaja}>Confirmar</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConfirmandoBaja(false);
                      }}
                    >
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
          )}
        </>
      )}
    </div>
  );
}
