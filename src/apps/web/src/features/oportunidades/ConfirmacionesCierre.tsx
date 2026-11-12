import { zodResolver } from "@hookform/resolvers/zod";
import {
  ETIQUETA_MOTIVO_PERDIDA,
  formatearFecha,
  formatearImporte,
  hoyEnBuenosAires,
  type MotivoPerdida,
  type OportunidadPerder,
} from "@rumbo/shared";
import { useCotizaciones } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { esquemaPerder, type DatosPerder } from "./esquemas";

const MOTIVOS = Object.entries(ETIQUETA_MOTIVO_PERDIDA) as [MotivoPerdida, string][];

const CLASE_PANEL = "flex flex-col gap-3 rounded-2xl border bg-card p-4";

const VENTA_DIRECTA = "venta-directa";
/** Con una cotización aceptada no hay nada que elegir: el POST va sin cuerpo. */
const SIN_CUERPO = "aceptada";

/**
 * Confirmación de ganar (RF-016, DEC-0028), la misma en el detalle y en el embudo: se elige la
 * cotización que aceptó el cliente (`borrador` o `enviada` vigente) o la venta directa.
 */
export function ConfirmarGanar({
  cliente,
  oportunidadId,
  pendiente,
  alConfirmar,
  alCancelar,
}: {
  cliente: AxiosInstance;
  oportunidadId: string;
  pendiente: boolean;
  alConfirmar: (cotizacionId?: string) => void;
  alCancelar: () => void;
}) {
  const consulta = useCotizaciones(cliente, oportunidadId, { por_pagina: 100 });
  const [elegida, setElegida] = useState<string | null>(null);
  const cotizaciones = consulta.data?.items ?? [];
  // CU-06 A2: con una cotización aceptada, la oportunidad se gana con ella y el backend la toma sola.
  const aceptada = cotizaciones.find((c) => c.estado === "aceptada");
  const hoy = hoyEnBuenosAires();
  const elegibles = cotizaciones.filter(
    (c) => c.estado === "borrador" || (c.estado === "enviada" && c.validez_hasta >= hoy),
  );
  // Sin cotizaciones elegibles solo existe la venta directa, que queda elegida.
  const opcion = aceptada
    ? SIN_CUERPO
    : elegibles.length === 0 && consulta.data
      ? VENTA_DIRECTA
      : elegida;

  return (
    <div role="group" aria-label="Ganar la oportunidad" className={CLASE_PANEL}>
      <p className="text-sm">
        {elegibles.length > 0 && !aceptada
          ? "¿Qué cotización aceptó el cliente? No se puede deshacer."
          : "¿Confirmás que la oportunidad se ganó? No se puede deshacer."}
      </p>
      {aceptada ? (
        <div className="text-sm">
          <p className="font-medium">Se gana con la cotización aceptada</p>
          <p>
            {formatearFecha(aceptada.fecha)} · {formatearImporte(aceptada.total, aceptada.moneda)}
          </p>
        </div>
      ) : !consulta.data && !consulta.isError ? (
        <p aria-busy="true" className="text-sm text-muted-foreground">
          Cargando cotizaciones…
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {consulta.isError && (
            <div className="flex items-center gap-2">
              <p role="alert" className="text-sm text-destructive">
                No pudimos cargar las cotizaciones de la oportunidad.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void consulta.refetch();
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
          {elegibles.map((cotizacion) => (
            <OpcionGanar
              key={cotizacion.id}
              valor={cotizacion.id}
              elegida={opcion}
              alElegir={setElegida}
            >
              {formatearFecha(cotizacion.fecha)} ·{" "}
              {formatearImporte(cotizacion.total, cotizacion.moneda)} ({cotizacion.moneda}) ·{" "}
              {cotizacion.items.map((item) => item.concepto).join(", ")}
            </OpcionGanar>
          ))}
          <OpcionGanar valor={VENTA_DIRECTA} elegida={opcion} alElegir={setElegida}>
            Sin cotización (venta directa)
          </OpcionGanar>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          disabled={pendiente || opcion === null}
          onClick={() => {
            alConfirmar(
              opcion === VENTA_DIRECTA || opcion === SIN_CUERPO || opcion === null
                ? undefined
                : opcion,
            );
          }}
        >
          Confirmar
        </Button>
        <Button variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function OpcionGanar({
  valor,
  elegida,
  alElegir,
  children,
}: {
  valor: string;
  elegida: string | null;
  alElegir: (valor: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="radio"
        name="cotizacion-ganadora"
        className="mt-1"
        checked={elegida === valor}
        onChange={() => {
          alElegir(valor);
        }}
      />
      <span>{children}</span>
    </label>
  );
}

/** Formulario del motivo al perder (RF-017), el mismo en el detalle y en el embudo. */
export function FormularioPerder({
  pendiente,
  alConfirmar,
  alCancelar,
}: {
  pendiente: boolean;
  alConfirmar: (datos: OportunidadPerder) => void;
  alCancelar: () => void;
}) {
  const formulario = useForm<DatosPerder>({
    resolver: zodResolver(esquemaPerder),
    defaultValues: { motivo_perdida: "" as MotivoPerdida, motivo_perdida_detalle: "" },
  });
  const { errors, isSubmitting } = formulario.formState;
  const motivoElegido = useWatch({ control: formulario.control, name: "motivo_perdida" });

  return (
    <form
      noValidate
      aria-label="Perder la oportunidad"
      className={CLASE_PANEL}
      onSubmit={(evento) =>
        void formulario.handleSubmit(({ motivo_perdida, motivo_perdida_detalle }) => {
          alConfirmar({
            motivo_perdida,
            ...(motivo_perdida === "otro" && { motivo_perdida_detalle }),
          });
        })(evento)
      }
    >
      <CampoFormulario
        id="motivo-perdida"
        etiqueta="Motivo"
        error={errors.motivo_perdida}
        anunciarError
      >
        {(props) => (
          <select
            required
            className={CLASE_SELECT}
            {...props}
            {...formulario.register("motivo_perdida")}
          >
            <option value="">Elegí un motivo</option>
            {MOTIVOS.map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      {motivoElegido === "otro" && (
        <CampoFormulario
          id="motivo-detalle"
          etiqueta="Detalle"
          error={errors.motivo_perdida_detalle}
        >
          {(props) => <Input {...props} {...formulario.register("motivo_perdida_detalle")} />}
        </CampoFormulario>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || pendiente}>
          Confirmar
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
