import type { Hotel, HotelEditar, UsuarioActual } from "@rumbo/shared";
import { useEditarHotel, useHotel } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Navigate, useNavigate, useParams } from "react-router";
import { BajaDelHotel } from "./BajaDelHotel";
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
  // Se compara el valor: la API manda «150000.00» y el formulario entrega «150000».
  if (Number(precio_referencia || null) !== Number(hotel.precio_referencia)) {
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
  const navegar = useNavigate();

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
      {hotel?.estado === "cerrado" && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este hotel está cerrado: no se puede editar.
        </p>
      )}
      {hotel && hotel.estado !== "cerrado" && (
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
          <BajaDelHotel cliente={cliente} hotel={hotel} />
        </>
      )}
    </div>
  );
}
