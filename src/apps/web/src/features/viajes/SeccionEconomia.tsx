import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatearImporte,
  type EconomiaRegistrada,
  type UsuarioActual,
  type Viaje,
} from "@rumbo/shared";
import {
  useAsesores,
  useOperador,
  useOperadores,
  useRegistrarEconomia,
  useUsuarios,
} from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensajeDeError } from "@/lib/errores";
import { calcularResultado, porcentajeDeGanancia } from "./calculos";
import { esquemaEconomia, type DatosEconomia } from "./esquemas";

const AVISO_NEGATIVO = "La ganancia o el margen quedan negativos. Igual podés guardar la economía.";
const AVISO_REBALANCEO =
  "El precio de venta cambió y los pagos ya no lo suman: rebalanceá el plan de pagos.";

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

type Economia = Pick<
  EconomiaRegistrada,
  "precio_venta" | "costo" | "operador_id" | "vendedor_id" | "comision_tipo" | "comision_vendedor"
>;

/** Valores del formulario a partir de lo que tiene el servidor: un id vacío es «sin elegir». */
function valoresDe(viaje: Economia): DatosEconomia {
  return {
    precio_venta: viaje.precio_venta,
    costo: viaje.costo,
    operador_id: viaje.operador_id ?? "",
    vendedor_id: viaje.vendedor_id ?? "",
    comision_tipo: viaje.comision_tipo,
    comision_vendedor: viaje.comision_vendedor,
  };
}

/** Las opciones del catálogo, más la actual si el catálogo no la trae (de baja o no visible). */
function conActual(
  opciones: { id: string; nombre: string }[],
  actualId: string | null,
  nombreActual: string,
) {
  return actualId && !opciones.some((o) => o.id === actualId)
    ? [...opciones, { id: actualId, nombre: nombreActual }]
    : opciones;
}

/**
 * Economía de la ficha del viaje (CU-10, pantallas 15 y 43). Editable para quien administra el
 * viaje; el freelance y los viajes finalizados o cancelados la ven en solo lectura. Ganancia y
 * margen se recalculan al escribir, pero los define el servidor al guardar.
 */
export function SeccionEconomia({
  cliente,
  usuario,
  viaje,
  editable,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  viaje: Viaje;
  editable: boolean;
}) {
  const registrar = useRegistrarEconomia(cliente);
  const { data: operadores } = useOperadores(cliente, { por_pagina: 100 });
  const { data: operadorActual } = useOperador(cliente, viaje.operador_id ?? "");
  // Solo admin y dueño listan usuarios (con su comisión por defecto); el resto elige entre los asesores.
  const { data: usuarios } = useUsuarios(
    cliente,
    { por_pagina: 100 },
    { enabled: usuario.rol === "admin" || usuario.rol === "dueno" },
  );
  const { data: asesores } = useAsesores(cliente, { enabled: editable });
  const vendedores = (usuarios?.items.filter((u) => u.activo) ?? asesores ?? []).map(
    ({ id, nombre }) => ({ id, nombre }),
  );
  const opcionesOperador = (operadores?.items ?? [])
    .filter((o) => o.activo)
    .map(({ id, nombre }) => ({ id, nombre }));

  const [avisos, setAvisos] = useState<readonly string[]>([]);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La comisión sigue al vendedor mientras nadie la toque (RN-01).
  const [comisionEditada, setComisionEditada] = useState(false);
  // Nombre del vendedor nuevo cuando no conocemos su comisión por defecto: la aplica la API.
  const [comisionDe, setComisionDe] = useState<string | null>(null);
  const formulario = useForm<DatosEconomia>({
    resolver: zodResolver(esquemaEconomia),
    defaultValues: valoresDe(viaje),
  });
  const { errors, isDirty, isSubmitting } = formulario.formState;
  const [precio, costo, vendedorId] = useWatch({
    control: formulario.control,
    name: ["precio_venta", "costo", "vendedor_id"],
  });

  const enVivo = calcularResultado(precio, costo);
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

  function elegirVendedor(id: string) {
    setComisionEditada(false);
    setComisionDe(null);
    if (id === "") return;
    if (id === viaje.vendedor_id) {
      // Volver al vendedor original conserva la comisión pactada del viaje.
      formulario.setValue("comision_tipo", viaje.comision_tipo, { shouldDirty: true });
      formulario.setValue("comision_vendedor", viaje.comision_vendedor, { shouldDirty: true });
    } else if (usuarios) {
      const elegido = usuarios.items.find((u) => u.id === id);
      formulario.setValue("comision_tipo", elegido?.comision_default_tipo ?? viaje.comision_tipo, {
        shouldDirty: true,
      });
      formulario.setValue("comision_vendedor", elegido?.comision_default_valor ?? "0.00", {
        shouldDirty: true,
      });
    } else {
      setComisionDe(vendedores.find((v) => v.id === id)?.nombre ?? "el vendedor");
    }
  }

  async function guardar(datos: DatosEconomia) {
    setError(null);
    setGuardado(false);
    // Con otro vendedor y la comisión sin tocar no se manda: la API aplica la del vendedor (RN-01).
    const vendedorCambiado = datos.vendedor_id !== (viaje.vendedor_id ?? "");
    const sinComision = datos.vendedor_id === "" || (vendedorCambiado && !comisionEditada);
    try {
      const registrada = await registrar.mutateAsync({
        viajeId: viaje.id,
        datos: {
          precio_venta: datos.precio_venta,
          costo: datos.costo,
          operador_id: datos.operador_id || null,
          vendedor_id: datos.vendedor_id || null,
          ...(!sinComision && {
            comision_tipo: datos.comision_tipo,
            comision_vendedor: datos.comision_vendedor,
          }),
        },
      });
      setAvisos(registrada.advertencias);
      formulario.reset(valoresDe(registrada));
      setComisionEditada(false);
      setComisionDe(null);
      setGuardado(true);
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  /** Comisión en importe: la cargada, o el porcentaje sobre la ganancia (RN-01). */
  const comisionImporte = formatearImporte(
    viaje.comision_tipo === "porcentaje"
      ? porcentajeDeGanancia(ganancia, viaje.comision_vendedor)
      : viaje.comision_vendedor,
    viaje.moneda,
  );
  const nombreVendedor =
    viaje.vendedor_id === usuario.id
      ? `${usuario.nombre} (vos)`
      : (vendedores.find((v) => v.id === viaje.vendedor_id)?.nombre ?? "—");
  const nombreOperador = operadorActual?.nombre ?? "—";
  const sinVendedor = vendedorId === "";

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
          <CampoFormulario id="operador" etiqueta="Operador">
            {(props) => (
              <select className={CLASE_SELECT} {...props} {...formulario.register("operador_id")}>
                <option value="">Sin operador</option>
                {conActual(opcionesOperador, viaje.operador_id, nombreOperador).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            )}
          </CampoFormulario>
          <CampoFormulario id="vendedor" etiqueta="Vendedor">
            {(props) => (
              <select
                className={CLASE_SELECT}
                {...props}
                {...formulario.register("vendedor_id", {
                  onChange: (evento: { target: { value: string } }) => {
                    elegirVendedor(evento.target.value);
                  },
                })}
              >
                <option value="">Sin vendedor</option>
                {conActual(vendedores, viaje.vendedor_id, nombreVendedor).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            )}
          </CampoFormulario>
          {comisionDe ? (
            <p className="text-sm text-muted-foreground">
              Se aplicará la comisión por defecto de {comisionDe}.
            </p>
          ) : (
            <>
              <CampoFormulario id="comision-tipo" etiqueta="Tipo de comisión">
                {(props) => (
                  <select
                    className={CLASE_SELECT}
                    disabled={sinVendedor}
                    {...props}
                    {...formulario.register("comision_tipo", {
                      onChange: () => {
                        setComisionEditada(true);
                      },
                    })}
                  >
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
                  <Input
                    inputMode="decimal"
                    disabled={sinVendedor}
                    {...props}
                    {...formulario.register("comision_vendedor", {
                      onChange: () => {
                        setComisionEditada(true);
                      },
                    })}
                  />
                )}
              </CampoFormulario>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            La ganancia y el margen se calculan solos a partir del precio y el costo.
            {sinVendedor
              ? " Sin vendedor no hay comisión."
              : " Si no tocás la comisión, se aplica la del vendedor."}
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
          <dl className="mt-3 flex flex-col gap-2">
            <Fila etiqueta="Operador">{nombreOperador}</Fila>
            <Fila etiqueta="Vendedor">{nombreVendedor}</Fila>
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
