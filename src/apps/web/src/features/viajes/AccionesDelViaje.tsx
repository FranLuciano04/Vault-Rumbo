import {
  ETIQUETA_ESTADO_VIAJE,
  formatearFecha,
  mensajeDeError,
  type UsuarioActual,
  type Viaje,
} from "@rumbo/shared";
import { useCorregirEstadoViaje, useFinalizarViaje, useIniciarViaje } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Accion = "iniciar" | "finalizar" | "corregir";

const ESTADO_ANTERIOR = { en_curso: "confirmado", finalizado: "en_curso" } as const;

/** Diálogo de confirmación de un cambio de estado (pantalla 16); el servidor decide si se puede. */
function ConfirmarEstado({
  titulo,
  detalle,
  cambio,
  fecha,
  confirmar,
  ejecutar,
  cerrar,
}: {
  titulo: string;
  detalle: string;
  cambio?: string;
  fecha?: string;
  confirmar: string;
  ejecutar: () => Promise<unknown>;
  cerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botonConfirmar.current?.focus();
  }, []);

  async function aceptar() {
    setError(null);
    setEnCurso(true);
    try {
      await ejecutar();
      cerrar();
    } catch (falla) {
      setError(mensajeDeError(falla));
      setEnCurso(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={titulo}
      className="flex flex-col gap-3 rounded-xl border bg-background p-4"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && !enCurso) cerrar();
      }}
    >
      <h3 className="text-base font-medium text-foreground">{titulo}</h3>
      {cambio && (
        <p className="text-sm font-medium">
          {cambio}
          {fecha && <span className="font-normal text-muted-foreground"> · {fecha}</span>}
        </p>
      )}
      <p className="text-sm">{detalle}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          ref={botonConfirmar}
          type="button"
          size="sm"
          disabled={enCurso}
          onClick={() => void aceptar()}
        >
          {confirmar}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={enCurso} onClick={cerrar}>
          Todavía no
        </Button>
      </div>
    </div>
  );
}

/**
 * Acciones de estado de la ficha (CU-08, RF-039, RF-042, pantalla 16): avanzar de confirmado a en
 * curso y de en curso a finalizado, y corregir al estado anterior. Cada una pide confirmación; las
 * guardas de EST-Viaje las valida la API y su motivo se muestra tal cual. Solo las ve quien puede
 * cambiar el estado: admin, dueño o el responsable del viaje.
 */
export function AccionesDelViaje({
  cliente,
  usuario,
  viaje,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  viaje: Viaje;
}) {
  const iniciar = useIniciarViaje(cliente);
  const finalizar = useFinalizarViaje(cliente);
  const corregir = useCorregirEstadoViaje(cliente);
  const [abierta, setAbierta] = useState<Accion | null>(null);
  const cerrar = () => {
    setAbierta(null);
  };

  const avanzar =
    viaje.estado === "confirmado"
      ? ({
          accion: "iniciar",
          etiqueta: "Pasar a en curso",
          destino: "en curso",
          detalle:
            "El sistema lo sugiere, pero el cambio lo confirmás vos: hacelo solo si el viaje realmente empezó. Si se demoró, dejalo como está.",
        } as const)
      : viaje.estado === "en_curso"
        ? ({
            accion: "finalizar",
            etiqueta: "Pasar a finalizado",
            destino: "finalizado",
            detalle:
              "El sistema lo sugiere, pero el cambio lo confirmás vos: hacelo solo si el viaje realmente terminó. Si se extendió, dejalo como está.",
          } as const)
        : null;
  const anterior =
    viaje.estado in ESTADO_ANTERIOR
      ? ESTADO_ANTERIOR[viaje.estado as keyof typeof ESTADO_ANTERIOR]
      : null;

  const puedeCambiarEstado =
    usuario.rol === "admin" || usuario.rol === "dueno" || viaje.responsable_id === usuario.id;
  if (!puedeCambiarEstado) {
    return <p>Solo el responsable del viaje, admin o dueño pueden cambiar su estado.</p>;
  }
  if (!avanzar && !anterior) return <p>No hay cambios de estado disponibles para este viaje.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {avanzar && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setAbierta(avanzar.accion);
            }}
          >
            {avanzar.etiqueta}
          </Button>
        )}
        {anterior && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAbierta("corregir");
            }}
          >
            Corregir estado
          </Button>
        )}
      </div>
      {avanzar && abierta === avanzar.accion && (
        <ConfirmarEstado
          titulo={`¿Pasar el viaje a «${avanzar.destino}»?`}
          detalle={avanzar.detalle}
          cambio={`${ETIQUETA_ESTADO_VIAJE[viaje.estado]} → ${ETIQUETA_ESTADO_VIAJE[avanzar.accion === "iniciar" ? "en_curso" : "finalizado"]}`}
          fecha={
            avanzar.accion === "iniciar"
              ? `Salida: ${formatearFecha(viaje.fecha_salida)}`
              : `Regreso: ${formatearFecha(viaje.fecha_regreso)}`
          }
          confirmar={avanzar.etiqueta}
          ejecutar={() =>
            (avanzar.accion === "iniciar" ? iniciar : finalizar).mutateAsync(viaje.id)
          }
          cerrar={cerrar}
        />
      )}
      {anterior && abierta === "corregir" && (
        <ConfirmarEstado
          titulo="Corregir el estado del viaje"
          detalle={`El viaje vuelve a «${ETIQUETA_ESTADO_VIAJE[anterior]}». Usalo solo si el cambio de estado fue un error.`}
          confirmar="Corregir estado"
          ejecutar={() => corregir.mutateAsync(viaje.id)}
          cerrar={cerrar}
        />
      )}
    </div>
  );
}
