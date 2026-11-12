import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  DESTINO_A_DEFINIR,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
  type FiltrosOportunidades,
  type Oportunidad,
  type UsuarioActual,
} from "@rumbo/shared";
import { useOportunidadesPorPaginas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
import { idDeUrl } from "@/lib/parametros";
import { cn } from "@/lib/utils";
import { FiltroResponsable } from "@/components/FiltroResponsable";
import { ColumnaEmbudo } from "./ColumnaEmbudo";
import { ConfirmarGanar, FormularioPerder } from "./ConfirmacionesCierre";
import { TarjetaArrastrada } from "./TarjetaOportunidad";
import { DESTINOS_POR_ESTADO } from "./transiciones";
import { useTransicionesOportunidad } from "./useTransicionesOportunidad";

const ESTADOS = Object.keys(ETIQUETA_ESTADO_OPORTUNIDAD) as EstadoOportunidad[];
const PESTANAS = [
  { clave: "mias", etiqueta: "Mis oportunidades" },
  { clave: "agencia", etiqueta: "Toda la agencia" },
] as const;

/** Sin instrucciones de lector de pantalla: dnd-kit las trae en inglés y el teclado va por el menú «Mover». */
const SIN_INSTRUCCIONES = { draggable: "" };

/** Sin anuncios de arrastre: dnd-kit los trae en inglés y la alternativa accesible es el menú «Mover». */
const SIN_ANUNCIOS = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/**
 * Embudo de oportunidades (CU-05, pantallas 12 y 34): una columna por estado con el total del
 * servidor. El freelance solo recibe lo suyo, por decisión de la API: no ve «Toda la agencia».
 */
export function PaginaOportunidades({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const esFreelance = usuario.rol === "freelance";
  const puedeFiltrarResponsable = usuario.rol === "admin" || usuario.rol === "dueno";
  // Los filtros pueden llegar en la URL desde el dashboard (RF-128); un estado desconocido se ignora.
  const [parametros] = useSearchParams();
  const estadoDeUrl = ESTADOS.find((e) => e === parametros.get("estado"));
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["clave"]>(
    puedeFiltrarResponsable && parametros.get("mios") !== "true" ? "agencia" : "mias",
  );
  const [responsableId, setResponsableId] = useState(
    puedeFiltrarResponsable ? idDeUrl(parametros.get("responsable_id")) : "",
  );
  // Soltar una tarjeta y elegir «Mover» en su menú pasan por la misma lógica (`mover`).
  const transiciones = useTransicionesOportunidad(cliente);
  const [confirmando, setConfirmando] = useState<{
    oportunidad: Oportunidad;
    paso: "ganar" | "perder";
  } | null>(null);
  const [arrastrando, setArrastrando] = useState<Oportunidad | null>(null);
  const panelConfirmacion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirmando) panelConfirmacion.current?.focus();
  }, [confirmando]);
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  function mover(oportunidad: Oportunidad, destino: EstadoOportunidad) {
    if (!DESTINOS_POR_ESTADO[oportunidad.estado].includes(destino)) return;
    if (destino === "ganada") setConfirmando({ oportunidad, paso: "ganar" });
    else if (destino === "perdida") setConfirmando({ oportunidad, paso: "perder" });
    else if (oportunidad.estado === "perdida") void transiciones.reactivar(oportunidad.id);
    else void transiciones.tomar(oportunidad.id);
  }

  function alEmpezar({ active }: DragStartEvent) {
    setArrastrando((active.data.current?.["oportunidad"] as Oportunidad | undefined) ?? null);
  }

  function alSoltar({ active, over }: DragEndEvent) {
    setArrastrando(null);
    const oportunidad = active.data.current?.["oportunidad"] as Oportunidad | undefined;
    if (oportunidad && over) mover(oportunidad, over.id as EstadoOportunidad);
  }

  const cerrarSiSalioBien = (salioBien: boolean) => {
    if (salioBien) setConfirmando(null);
  };

  // «Mis oportunidades» pide `mios`; «Toda la agencia», sin `mios` (y con `responsable_id` si se elige uno).
  const filtros: FiltrosOportunidades =
    pestana === "mias" || esFreelance
      ? { mios: true }
      : responsableId
        ? { responsable_id: responsableId }
        : {};
  // Una consulta por estado: cada columna trae su `total` y sus páginas («Ver más»).
  // Con un estado en la URL solo se pide y se muestra esa columna.
  const useColumna = (estado: EstadoOportunidad) =>
    useOportunidadesPorPaginas(
      cliente,
      { ...filtros, estado },
      { enabled: !estadoDeUrl || estadoDeUrl === estado },
    );
  const consultas = (
    [
      { estado: "nueva", consulta: useColumna("nueva") },
      { estado: "en_gestion", consulta: useColumna("en_gestion") },
      { estado: "cotizada", consulta: useColumna("cotizada") },
      { estado: "ganada", consulta: useColumna("ganada") },
      { estado: "perdida", consulta: useColumna("perdida") },
    ] as const
  ).filter(({ estado }) => !estadoDeUrl || estadoDeUrl === estado);
  const cargando = consultas.some(({ consulta }) => consulta.isPending);
  const fallo = consultas.some(({ consulta }) => consulta.isError && !consulta.data);
  const actualizando = consultas.some(({ consulta }) => consulta.isPlaceholderData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Oportunidades</h1>
        <Link to="/oportunidades/nueva" className={variantesBoton()}>
          Nueva consulta
        </Link>
      </div>
      {esFreelance && (
        <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
          Estás viendo solo tus clientes, oportunidades y viajes. El catálogo de hoteles, destinos y
          operadores es compartido.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Vista" className="flex rounded-lg border bg-card p-1">
          {PESTANAS.filter(({ clave }) => !esFreelance || clave === "mias").map(
            ({ clave, etiqueta }) => (
              <Button
                key={clave}
                id={`pestana-${clave}`}
                role="tab"
                aria-controls="panel-embudo"
                aria-selected={pestana === clave}
                variant={pestana === clave ? "default" : "ghost"}
                onClick={() => {
                  setPestana(clave);
                  setResponsableId("");
                }}
              >
                {etiqueta}
              </Button>
            ),
          )}
        </div>
        {puedeFiltrarResponsable && pestana === "agencia" && (
          <FiltroResponsable cliente={cliente} valor={responsableId} alCambiar={setResponsableId} />
        )}
      </div>

      {confirmando && (
        <div ref={panelConfirmacion} tabIndex={-1} className="space-y-2 outline-none">
          <p className="text-sm font-medium">
            {confirmando.oportunidad.destino_consultado ?? DESTINO_A_DEFINIR} ·{" "}
            {confirmando.oportunidad.cliente_nombre}
          </p>
          {confirmando.paso === "ganar" ? (
            <ConfirmarGanar
              key={confirmando.oportunidad.id}
              cliente={cliente}
              oportunidadId={confirmando.oportunidad.id}
              pendiente={transiciones.pendiente}
              alConfirmar={(cotizacionId) =>
                void transiciones
                  .ganar(confirmando.oportunidad.id, cotizacionId)
                  .then(cerrarSiSalioBien)
              }
              alCancelar={() => {
                setConfirmando(null);
              }}
            />
          ) : (
            <FormularioPerder
              key={confirmando.oportunidad.id}
              pendiente={transiciones.pendiente}
              alConfirmar={(datos) =>
                void transiciones.perder(confirmando.oportunidad.id, datos).then(cerrarSiSalioBien)
              }
              alCancelar={() => {
                setConfirmando(null);
              }}
            />
          )}
        </div>
      )}
      {transiciones.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {transiciones.error}
        </p>
      )}
      {fallo ? (
        <p role="alert" className="text-sm text-destructive">
          No pudimos cargar el embudo. Probá de nuevo en un momento.
        </p>
      ) : cargando ? (
        <p role="status" aria-busy="true" className="text-sm text-muted-foreground">
          Cargando oportunidades…
        </p>
      ) : (
        <DndContext
          sensors={sensores}
          accessibility={{
            announcements: SIN_ANUNCIOS,
            screenReaderInstructions: SIN_INSTRUCCIONES,
          }}
          onDragStart={alEmpezar}
          onDragEnd={alSoltar}
          onDragCancel={() => {
            setArrastrando(null);
          }}
        >
          <div
            id="panel-embudo"
            role="tabpanel"
            aria-labelledby={`pestana-${pestana}`}
            aria-busy={actualizando}
            className={cn(
              "grid gap-4 md:grid-cols-3 xl:grid-cols-5",
              actualizando && "opacity-70 transition-opacity",
            )}
          >
            {consultas.map(({ estado, consulta }) => (
              <ColumnaEmbudo
                key={estado}
                estado={estado}
                consulta={consulta}
                usuario={usuario}
                alMover={mover}
                bloqueada={transiciones.pendiente}
              />
            ))}
          </div>
          <DragOverlay>
            {arrastrando && <TarjetaArrastrada oportunidad={arrastrando} />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
