import { zodResolver } from "@hookform/resolvers/zod";
import { formatearImporte, type EconomiaRegistrada, type Viaje } from "@rumbo/shared";
import { useRegistrarEconomia } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensajeDeError } from "@/lib/errores";
import { esquemaEconomia, type DatosEconomia } from "./esquemas";

const AVISO_NEGATIVO = "La ganancia o el margen quedan negativos. Igual podés guardar la economía.";
const AVISO_REBALANCEO =
  "El precio de venta cambió y los pagos ya no lo suman: rebalanceá el plan de pagos.";

/** Ganancia (importe) y margen (fracción) de un precio y un costo; `null` si todavía no son números. */
function calcular(precio: string, costo: string) {
  const p = Number(precio);
  const c = Number(costo);
  if (!precio.trim() || !costo.trim() || Number.isNaN(p) || Number.isNaN(c)) return null;
  return { ganancia: (p - c).toFixed(2), margen: p > 0 ? (p - c) / p : null };
}

/** «25 %», «16,7 %» o «—» cuando no hay margen que mostrar. */
function formatearMargen(margen: number | null) {
  if (margen === null) return "—";
  return `${String(Number((margen * 100).toFixed(1))).replace(".", ",")} %`;
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function Indicador({
  etiqueta,
  valor,
  negativo,
}: {
  etiqueta: string;
  valor: string;
  negativo: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${negativo ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}
    >
      <p className="text-xs">{etiqueta}</p>
      <p className="text-xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

/** Ganancia y margen del viaje, en rojo cuando son negativos. */
function Resultado({
  ganancia,
  margen,
  moneda,
}: {
  ganancia: string;
  margen: number | null;
  moneda: Viaje["moneda"];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Indicador
        etiqueta="Ganancia"
        valor={formatearImporte(ganancia, moneda)}
        negativo={Number(ganancia) < 0}
      />
      <Indicador etiqueta="Margen" valor={formatearMargen(margen)} negativo={(margen ?? 0) < 0} />
    </div>
  );
}

/**
 * Economía de la ficha del viaje (CU-10, pantallas 15 y 43). Editable para quien administra el
 * viaje; el freelance y los viajes finalizados o cancelados la ven en solo lectura. Ganancia y
 * margen se recalculan al escribir, pero los define el servidor al guardar.
 */
export function SeccionEconomia({
  cliente,
  viaje,
  editable,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  editable: boolean;
}) {
  const registrar = useRegistrarEconomia(cliente);
  const [avisos, setAvisos] = useState<readonly string[]>(
    () => (viaje as Partial<EconomiaRegistrada>).advertencias ?? [],
  );
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosEconomia>({
    resolver: zodResolver(esquemaEconomia),
    defaultValues: {
      precio_venta: viaje.precio_venta,
      costo: viaje.costo,
      comision_tipo: viaje.comision_tipo,
      comision_vendedor: viaje.comision_vendedor,
    },
  });
  const { errors, isDirty, isSubmitting } = formulario.formState;
  const [precio, costo] = useWatch({
    control: formulario.control,
    name: ["precio_venta", "costo"],
  });

  const enVivo = calcular(precio, costo);
  const ganancia = editable ? (enVivo?.ganancia ?? viaje.ganancia) : viaje.ganancia;
  const margen =
    editable && enVivo ? enVivo.margen : viaje.margen === null ? null : Number(viaje.margen);
  const negativo =
    Number(ganancia) < 0 ||
    (margen ?? 0) < 0 ||
    (!isDirty && avisos.some((a) => a === "ganancia_negativa" || a === "margen_negativo"));
  const desbalanceado = avisos.includes("plan_desbalanceado");
  const mensajes = [
    ...(negativo ? [AVISO_NEGATIVO] : []),
    ...(desbalanceado && !isDirty ? [AVISO_REBALANCEO] : []),
    ...(error ? [error] : []),
  ];

  async function guardar(datos: DatosEconomia) {
    setError(null);
    setGuardado(false);
    try {
      const registrada = await registrar.mutateAsync({
        viajeId: viaje.id,
        datos: { ...datos },
      });
      setAvisos(registrada.advertencias);
      formulario.reset(datos);
      setGuardado(true);
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  /** Comisión en importe: la cargada, o el porcentaje sobre la ganancia (RN-01). */
  const comisionImporte = formatearImporte(
    (viaje.comision_tipo === "porcentaje"
      ? (Number(ganancia) * Number(viaje.comision_vendedor)) / 100
      : Number(viaje.comision_vendedor)
    ).toFixed(2),
    viaje.moneda,
  );

  return (
    <section aria-labelledby="titulo-economia" className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 id="titulo-economia" className="text-lg font-semibold">
          Economía
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
          {viaje.moneda}
        </span>
      </div>

      {mensajes.length > 0 && (
        <div role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {mensajes.map((mensaje) => (
            <p key={mensaje}>{mensaje}</p>
          ))}
        </div>
      )}

      {editable ? (
        <form
          noValidate
          aria-label="Economía del viaje"
          className="mt-4 flex flex-col gap-4"
          onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
        >
          <CampoFormulario id="precio-venta" etiqueta="Precio de venta" error={errors.precio_venta}>
            {(props) => (
              <Input inputMode="decimal" {...props} {...formulario.register("precio_venta")} />
            )}
          </CampoFormulario>
          <CampoFormulario id="costo" etiqueta="Costo del operador" error={errors.costo}>
            {(props) => <Input inputMode="decimal" {...props} {...formulario.register("costo")} />}
          </CampoFormulario>
          <Resultado ganancia={ganancia} margen={margen} moneda={viaje.moneda} />
          <CampoFormulario id="comision-tipo" etiqueta="Tipo de comisión">
            {(props) => (
              <select className={CLASE_SELECT} {...props} {...formulario.register("comision_tipo")}>
                <option value="importe">Importe</option>
                <option value="porcentaje">Porcentaje</option>
              </select>
            )}
          </CampoFormulario>
          <CampoFormulario
            id="comision-vendedor"
            etiqueta="Comisión del vendedor"
            error={errors.comision_vendedor}
          >
            {(props) => (
              <Input inputMode="decimal" {...props} {...formulario.register("comision_vendedor")} />
            )}
          </CampoFormulario>
          <p className="text-xs text-muted-foreground">
            La ganancia y el margen se calculan solos a partir del precio y el costo.
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || registrar.isPending}>
              Guardar economía
            </Button>
            {guardado && !isDirty && (
              <p role="status" className="text-sm text-emerald-700">
                Economía guardada
              </p>
            )}
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-4 flex flex-col gap-2">
            <Fila etiqueta="Precio de venta">
              {formatearImporte(viaje.precio_venta, viaje.moneda)}
            </Fila>
            <Fila etiqueta="Costo del operador">{formatearImporte(viaje.costo, viaje.moneda)}</Fila>
          </dl>
          <Resultado ganancia={ganancia} margen={margen} moneda={viaje.moneda} />
          <dl>
            <Fila etiqueta="Comisión del vendedor">
              {viaje.comision_tipo === "porcentaje" ? (
                <>
                  {Number(viaje.comision_vendedor)} % · {comisionImporte}
                </>
              ) : (
                comisionImporte
              )}
            </Fila>
          </dl>
        </>
      )}
    </section>
  );
}
