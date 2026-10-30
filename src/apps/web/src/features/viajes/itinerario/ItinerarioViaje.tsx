import { formatearFecha, type Hotel, type Tramo, type Viaje } from "@rumbo/shared";
import {
  useAgregarTramo,
  useEditarTramo,
  useHotel,
  useItinerario,
  useQuitarTramo,
} from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { BuscadorHoteles } from "./BuscadorHoteles";
import type { DatosTramo } from "./esquemas";
import { FormularioTramo } from "./FormularioTramo";

type Panel =
  { tipo: "buscar" } | { tipo: "nuevo"; hotel: Hotel } | { tipo: "editar"; tramoId: string };

/** Los textos vacíos del formulario son «sin vencimiento». */
const vencimientoDe = (datos: DatosTramo) => datos.vencimiento_pago_proveedor || null;

function FilaTramo({
  cliente,
  tramo,
  editable,
  abierto,
  alPagar,
  alEditar,
  alQuitar,
  children,
}: {
  cliente: AxiosInstance;
  tramo: Tramo;
  editable: boolean;
  abierto: boolean;
  alPagar: (pagado: boolean) => void;
  alEditar: () => void;
  alQuitar: () => void;
  children?: React.ReactNode;
}) {
  const { data: hotel } = useHotel(cliente, tramo.hotel_id);
  const nombre = hotel?.nombre ?? "Hotel";

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Tramo {tramo.orden}</p>
          <p className="text-sm font-medium text-foreground">{nombre}</p>
          <p className="text-sm">
            {formatearFecha(tramo.check_in)} → {formatearFecha(tramo.check_out)}
          </p>
          {tramo.vencimiento_pago_proveedor && (
            <p className="text-xs text-muted-foreground">
              Pago al proveedor: vence el {formatearFecha(tramo.vencimiento_pago_proveedor)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Pagado al proveedor"
              checked={tramo.pago_proveedor_realizado}
              disabled={!editable}
              onChange={(evento) => {
                alPagar(evento.target.checked);
              }}
            />
            Pagado
          </label>
          {editable && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Editar ${nombre}`}
                disabled={abierto}
                onClick={alEditar}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Quitar ${nombre}`}
                onClick={alQuitar}
              >
                Quitar
              </Button>
            </>
          )}
        </div>
      </div>
      {children}
    </li>
  );
}

/**
 * Itinerario de hoteles de la ficha del viaje (CU-09, pantalla 17): tramos en orden, buscador del
 * catálogo para agregar, edición de fechas, baja y marca del pago al proveedor. Con `editable`
 * en falso (freelance, viaje finalizado o cancelado) es de solo lectura.
 */
export function ItinerarioViaje({
  cliente,
  viaje,
  editable,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  editable: boolean;
}) {
  const itinerario = useItinerario(cliente, viaje.id);
  const agregar = useAgregarTramo(cliente);
  const editar = useEditarTramo(cliente);
  const quitar = useQuitarTramo(cliente);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const tramos = [...(itinerario.data ?? [])].sort((a, b) => a.orden - b.orden);
  const cerrar = () => {
    setPanel(null);
  };

  async function accion(ejecutar: () => Promise<unknown>) {
    setAviso(null);
    try {
      await ejecutar();
    } catch (falla) {
      setAviso(mensajeDeError(falla));
    }
  }

  async function agregarTramo(hotel: Hotel, datos: DatosTramo) {
    await agregar.mutateAsync({
      viajeId: viaje.id,
      datos: {
        hotel_id: hotel.id,
        check_in: datos.check_in,
        check_out: datos.check_out,
        orden: Math.max(0, ...tramos.map((t) => t.orden)) + 1,
        ...(vencimientoDe(datos) && { vencimiento_pago_proveedor: vencimientoDe(datos) }),
      },
    });
    cerrar();
  }

  async function editarTramo(tramoId: string, datos: DatosTramo, cambiados: (keyof DatosTramo)[]) {
    await editar.mutateAsync({
      tramoId,
      cambios: {
        ...(cambiados.includes("check_in") && { check_in: datos.check_in }),
        ...(cambiados.includes("check_out") && { check_out: datos.check_out }),
        ...(cambiados.includes("vencimiento_pago_proveedor") && {
          vencimiento_pago_proveedor: vencimientoDe(datos),
        }),
      },
    });
    cerrar();
  }

  function formularioDeEdicion(tramo: Tramo) {
    return (
      <FormularioTramo
        viaje={viaje}
        titulo="Editar tramo"
        inicial={{
          check_in: tramo.check_in,
          check_out: tramo.check_out,
          vencimiento_pago_proveedor: tramo.vencimiento_pago_proveedor ?? "",
        }}
        textoEnviar="Guardar tramo"
        enviar={(datos, cambiados) => editarTramo(tramo.id, datos, cambiados)}
        cancelar={cerrar}
      />
    );
  }

  return (
    <div>
      {aviso && (
        <p role="alert" className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {aviso}
        </p>
      )}

      {itinerario.isPending && <p role="status">Cargando itinerario…</p>}
      {itinerario.isError && (
        <div role="alert" className="flex items-center gap-3">
          <p>No pudimos cargar el itinerario. Probá de nuevo en unos minutos.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void itinerario.refetch()}
          >
            Reintentar
          </Button>
        </div>
      )}
      {itinerario.isSuccess && tramos.length === 0 && (
        <p>Todavía no hay hoteles en el itinerario. Agregá el primero.</p>
      )}
      {tramos.length > 0 && (
        <ul aria-label="Tramos del itinerario" className="flex flex-col gap-3">
          {tramos.map((tramo) => (
            <FilaTramo
              key={tramo.id}
              cliente={cliente}
              tramo={tramo}
              editable={editable}
              abierto={panel?.tipo === "editar" && panel.tramoId === tramo.id}
              alPagar={(pagado) =>
                void accion(() =>
                  editar.mutateAsync({
                    tramoId: tramo.id,
                    cambios: { pago_proveedor_realizado: pagado },
                  }),
                )
              }
              alEditar={() => {
                setAviso(null);
                setPanel({ tipo: "editar", tramoId: tramo.id });
              }}
              alQuitar={() => void accion(() => quitar.mutateAsync(tramo.id))}
            >
              {panel?.tipo === "editar" && panel.tramoId === tramo.id && formularioDeEdicion(tramo)}
            </FilaTramo>
          ))}
        </ul>
      )}

      {editable && panel?.tipo === "buscar" && (
        <BuscadorHoteles
          cliente={cliente}
          cancelar={cerrar}
          elegir={(hotel) => {
            setPanel({ tipo: "nuevo", hotel });
          }}
        />
      )}
      {editable && panel?.tipo === "nuevo" && (
        <div className="mt-3">
          <p className="text-sm font-medium text-foreground">{`Hotel elegido: ${panel.hotel.nombre}`}</p>
          <FormularioTramo
            viaje={viaje}
            titulo="Agregar tramo"
            inicial={{ check_in: "", check_out: "", vencimiento_pago_proveedor: "" }}
            textoEnviar="Agregar al itinerario"
            enviar={(datos) => agregarTramo(panel.hotel, datos)}
            cancelar={cerrar}
          />
        </div>
      )}
      {editable && panel === null && (
        <Button
          type="button"
          className="mt-3"
          onClick={() => {
            setAviso(null);
            setPanel({ tipo: "buscar" });
          }}
        >
          Agregar hotel
        </Button>
      )}
    </div>
  );
}
