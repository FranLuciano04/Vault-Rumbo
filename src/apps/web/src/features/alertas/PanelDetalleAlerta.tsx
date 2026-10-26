import {
  datosDeContexto,
  ETIQUETA_ESTADO_ALERTA,
  ETIQUETA_ESTADO_VIAJE,
  ETIQUETA_TIPO_ALERTA,
  formatearFecha,
  type Alerta,
} from "@rumbo/shared";
import { useAlerta, useRequisitosDestino } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { FormularioPosponer } from "./FormularioPosponer";

const POR_PAGINA_REQUISITOS = 100;

function RequisitosDelDestino({
  cliente,
  destinoId,
}: {
  cliente: AxiosInstance;
  destinoId: string;
}) {
  const requisitos = useRequisitosDestino(cliente, destinoId, {
    por_pagina: POR_PAGINA_REQUISITOS,
  });
  return (
    <section aria-labelledby="requisitos-destino" className="flex flex-col gap-2">
      <h3 id="requisitos-destino" className="text-sm font-semibold">
        Requisitos del destino
      </h3>
      {requisitos.isPending && <p role="status">Cargando requisitos…</p>}
      {requisitos.isError && (
        <p role="alert" className="text-sm text-destructive">
          No pudimos cargar los requisitos. Probá de nuevo en unos minutos.
        </p>
      )}
      {requisitos.data?.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Este destino no tiene requisitos cargados.</p>
      )}
      {requisitos.data && requisitos.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {requisitos.data.items.map((requisito) => (
            <li key={requisito.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{requisito.nombre}</p>
                {requisito.descripcion && (
                  <p className="text-muted-foreground">{requisito.descripcion}</p>
                )}
              </div>
              {requisito.obligatorio && (
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  Obligatorio
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Contenido({
  cliente,
  alerta,
  hoy,
  alResolver,
  alMarcarVista,
  marcandoVista,
  posponiendo,
  setPosponiendo,
}: {
  cliente: AxiosInstance;
  alerta: Alerta;
  hoy: string;
  alResolver: () => void;
  alMarcarVista: () => void;
  marcandoVista: boolean;
  posponiendo: boolean;
  setPosponiendo: (posponiendo: boolean) => void;
}) {
  const { viaje } = alerta.contexto;
  const esPago = alerta.tipo === "pago";
  // El viaje se arma aparte: el panel lo muestra con fechas y estado.
  const datos = datosDeContexto(alerta).filter(({ etiqueta }) => etiqueta !== "Viaje");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {ETIQUETA_TIPO_ALERTA[alerta.tipo]}
        </p>
        <p className="text-lg font-medium">{alerta.descripcion}</p>
        <p className="mt-1 flex gap-3 text-sm text-muted-foreground">
          <span>{formatearFecha(alerta.fecha)}</span>
          <span>{ETIQUETA_ESTADO_ALERTA[alerta.estado]}</span>
        </p>
      </div>
      {viaje && (
        <dl className="text-sm">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Viaje
          </dt>
          <dd>
            <span className="font-medium">{viaje.destino}</span>{" "}
            <span>
              {formatearFecha(viaje.fecha_salida)} al {formatearFecha(viaje.fecha_regreso)}
            </span>{" "}
            <span className="text-muted-foreground">{ETIQUETA_ESTADO_VIAJE[viaje.estado]}</span>
          </dd>
        </dl>
      )}
      {datos.map(({ etiqueta, valor }) => (
        <dl key={etiqueta} className="text-sm">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {etiqueta}
          </dt>
          <dd>{valor}</dd>
        </dl>
      ))}
      {viaje && <RequisitosDelDestino cliente={cliente} destinoId={viaje.destino_id} />}
      {esPago && (
        <p className="text-sm text-muted-foreground">Se resuelve al registrar el cobro.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!esPago && <Button onClick={alResolver}>Resolver</Button>}
        {alerta.estado === "pendiente" && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPosponiendo(true);
              }}
            >
              Posponer
            </Button>
            <Button variant="ghost" disabled={marcandoVista} onClick={alMarcarVista}>
              Marcar como vista
            </Button>
          </>
        )}
      </div>
      {posponiendo && (
        <FormularioPosponer
          cliente={cliente}
          alerta={alerta}
          hoy={hoy}
          alCerrar={() => {
            setPosponiendo(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Panel lateral con el detalle de una alerta (CU-14 paso 3, pantalla 49): su origen, los requisitos
 * del destino si es de un viaje y las mismas acciones que la fila.
 */
export function PanelDetalleAlerta({
  cliente,
  alertaId,
  hoy,
  alCerrar,
  alResolver,
  alMarcarVista,
  marcandoVista,
}: {
  cliente: AxiosInstance;
  alertaId: string;
  hoy: string;
  alCerrar: () => void;
  alResolver: (alerta: Alerta) => void;
  alMarcarVista: (alerta: Alerta) => void;
  marcandoVista: boolean;
}) {
  const detalle = useAlerta(cliente, alertaId);
  const [posponiendo, setPosponiendo] = useState(false);
  const cerrar = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    cerrar.current?.focus();
  }, []);
  // Escape cierra primero el formulario de posponer; la trampa de foco mantiene Tab dentro.
  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (posponiendo) setPosponiendo(false);
      else alCerrar();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const foco = [
      ...panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"),
    ];
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo?.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero?.focus();
    }
  };
  return (
    <aside
      ref={panel}
      role="dialog"
      aria-modal="true"
      onKeyDown={alTeclear}
      aria-label="Detalle de la alerta"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l bg-background p-6 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Detalle de la alerta</h2>
        <Button ref={cerrar} size="sm" variant="ghost" aria-label="Cerrar" onClick={alCerrar}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {detalle.isPending && <p role="status">Cargando detalle…</p>}
      {detalle.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {mensajeDeError(detalle.error)}
        </p>
      )}
      {detalle.data && (
        <Contenido
          cliente={cliente}
          alerta={detalle.data}
          hoy={hoy}
          alResolver={() => {
            alResolver(detalle.data);
          }}
          alMarcarVista={() => {
            // El botón se desmonta al pasar a «vista»: el foco queda en «Cerrar».
            cerrar.current?.focus();
            alMarcarVista(detalle.data);
          }}
          posponiendo={posponiendo}
          setPosponiendo={setPosponiendo}
          marcandoVista={marcandoVista}
        />
      )}
    </aside>
  );
}
