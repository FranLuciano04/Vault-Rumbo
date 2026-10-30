import { zodResolver } from "@hookform/resolvers/zod";
import type { Cotizacion, Destino, Oportunidad } from "@rumbo/shared";
import { useAsesores, useConfirmarReserva } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { ETIQUETA_TIPO_PAGO } from "../viajes/plan/etiquetas";
import { esquemaReserva, type DatosReserva } from "./esquemas";

const CAMPOS = [
  "destino_id",
  "fecha_salida",
  "fecha_regreso",
  "categoria",
  "responsable_id",
  "moneda",
  "precio_venta",
  "costo",
] as const;

/**
 * Diálogo de confirmación de la reserva (CU-07, RF-032, RF-033, RF-036). Además de los datos del
 * viaje pide lo que exige el contrato: la economía (precio de venta precargado de la cotización
 * aceptada) y una cuota única por el precio de venta; en la ficha del viaje se ajustan. En la venta
 * directa (sin cotización aceptada) también se pide la moneda. Al confirmar sigue la ficha del viaje.
 */
export function DialogoReserva({
  cliente,
  oportunidad,
  aceptada,
  destinos,
  alCerrar,
}: {
  cliente: AxiosInstance;
  oportunidad: Oportunidad;
  aceptada?: Cotizacion;
  destinos: Destino[];
  alCerrar: () => void;
}) {
  const navegar = useNavigate();
  const confirmar = useConfirmarReserva(cliente);
  const { data: asesores = [] } = useAsesores(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosReserva>({
    resolver: zodResolver(esquemaReserva),
    defaultValues: {
      destino_id: "",
      fecha_salida: "",
      fecha_regreso: "",
      responsable_id: "",
      moneda: "ARS",
      precio_venta: aceptada?.total ?? "",
      costo: "",
      tipo_de_pago: "saldo",
      vencimiento: "",
    },
  });
  const { errors, isSubmitting } = formulario.formState;
  const monedaElegida = useWatch({ control: formulario.control, name: "moneda" });
  const moneda = aceptada?.moneda ?? monedaElegida;

  async function enviar(datos: DatosReserva) {
    setError(null);
    try {
      const viaje = await confirmar.mutateAsync({
        oportunidadId: oportunidad.id,
        datos: {
          destino_id: datos.destino_id,
          fecha_salida: datos.fecha_salida,
          fecha_regreso: datos.fecha_regreso,
          categoria: datos.categoria,
          ...(datos.responsable_id && { responsable_id: datos.responsable_id }),
          ...(!aceptada && { moneda: datos.moneda }),
          economia: { precio_venta: datos.precio_venta, costo: datos.costo },
          plan_de_pagos: {
            pagos: [
              {
                monto: datos.precio_venta,
                tipo: datos.tipo_de_pago,
                vencimiento: datos.vencimiento,
              },
            ],
          },
        },
      });
      void navegar(`/viajes/${viaje.id}`);
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      role="dialog"
      aria-label="Confirmar reserva"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && !isSubmitting) alCerrar();
      }}
      onSubmit={(evento) => void formulario.handleSubmit(enviar)(evento)}
    >
      <h2 className="text-lg font-semibold">Confirmar reserva</h2>
      <CampoFormulario id="reserva-destino" etiqueta="Destino" error={errors.destino_id}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("destino_id")}>
            <option value="">Seleccioná un destino</option>
            {destinos.map((destino) => (
              <option key={destino.id} value={destino.id}>
                {destino.nombre}, {destino.pais}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoFormulario id="reserva-salida" etiqueta="Salida" error={errors.fecha_salida}>
          {(props) => <Input type="date" {...props} {...formulario.register("fecha_salida")} />}
        </CampoFormulario>
        <CampoFormulario id="reserva-regreso" etiqueta="Regreso" error={errors.fecha_regreso}>
          {(props) => <Input type="date" {...props} {...formulario.register("fecha_regreso")} />}
        </CampoFormulario>
      </div>
      <CampoFormulario id="reserva-categoria" etiqueta="Categoría" error={errors.categoria}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("categoria")}>
            <option value="">Seleccioná una categoría</option>
            <option value="individual">Individual</option>
            <option value="grupal">Grupal</option>
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario
        id="reserva-responsable"
        etiqueta="Responsable"
        error={errors.responsable_id}
      >
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("responsable_id")}>
            <option value="">El de la oportunidad</option>
            {asesores.map((asesor) => (
              <option key={asesor.id} value={asesor.id}>
                {asesor.nombre}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-medium">Economía y primer pago</legend>
        <p className="text-sm text-muted-foreground">Después se ajustan desde el viaje.</p>
        {!aceptada && (
          <CampoFormulario id="reserva-moneda" etiqueta="Moneda" error={errors.moneda}>
            {(props) => (
              <select className={CLASE_SELECT} {...props} {...formulario.register("moneda")}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            )}
          </CampoFormulario>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFormulario
            id="reserva-precio"
            etiqueta={`Precio de venta (${moneda})`}
            error={errors.precio_venta}
          >
            {(props) => (
              <Input inputMode="decimal" {...props} {...formulario.register("precio_venta")} />
            )}
          </CampoFormulario>
          <CampoFormulario id="reserva-costo" etiqueta={`Costo (${moneda})`} error={errors.costo}>
            {(props) => <Input inputMode="decimal" {...props} {...formulario.register("costo")} />}
          </CampoFormulario>
          <CampoFormulario
            id="reserva-tipo-pago"
            etiqueta="Tipo de pago"
            error={errors.tipo_de_pago}
          >
            {(props) => (
              <select className={CLASE_SELECT} {...props} {...formulario.register("tipo_de_pago")}>
                {Object.entries(ETIQUETA_TIPO_PAGO).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            )}
          </CampoFormulario>
          <CampoFormulario
            id="reserva-vencimiento"
            etiqueta="Vencimiento del pago"
            error={errors.vencimiento}
          >
            {(props) => <Input type="date" {...props} {...formulario.register("vencimiento")} />}
          </CampoFormulario>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          Confirmar reserva
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={alCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
