import { zodResolver } from "@hookform/resolvers/zod";
import {
  ETIQUETA_ESTADO_COTIZACION,
  formatearFecha,
  formatearImporte,
  type Cotizacion,
  type Moneda,
  type UsuarioActual,
} from "@rumbo/shared";
import { useConfiguracion, useEmitirCotizacion } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { esquemaCotizacion, type DatosCotizacion } from "./esquemas";
import { importeComoTexto, sumarImportes, sumarMesesAHoy } from "./calculos";

const MONEDAS: Moneda[] = ["ARS", "USD"];

/** Emisión de una cotización (RF-021, RF-022): ítems, moneda, total y vigencia a la vista. */
export function FormularioCotizacion({
  cliente,
  usuario,
  oportunidadId,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  oportunidadId: string;
}) {
  const emitir = useEmitirCotizacion(cliente);
  // Los parámetros del negocio solo los lee la gestión: el resto no ve una fecha estimada.
  const leeConfiguracion = usuario.rol === "admin" || usuario.rol === "dueno";
  const configuracion = useConfiguracion(cliente, { enabled: leeConfiguracion });
  const meses = configuracion.data?.vigencia_cotizacion_meses;
  const [error, setError] = useState<string | null>(null);
  const [emitida, setEmitida] = useState<Cotizacion | null>(null);
  const formulario = useForm<DatosCotizacion>({
    resolver: zodResolver(esquemaCotizacion),
    defaultValues: { moneda: "ARS", items: [{ concepto: "", precio: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: formulario.control, name: "items" });
  const { errors, isSubmitting } = formulario.formState;
  const moneda = useWatch({ control: formulario.control, name: "moneda" });
  const items = useWatch({ control: formulario.control, name: "items" });
  const total = sumarImportes(items.map((item) => item.precio));

  async function enviar(datos: DatosCotizacion) {
    setError(null);
    setEmitida(null);
    try {
      const cotizacion = await emitir.mutateAsync({
        oportunidadId,
        datos: {
          moneda: datos.moneda,
          items: datos.items.map(({ concepto, precio }) => ({
            concepto,
            precio: importeComoTexto(precio),
          })),
        },
      });
      setEmitida(cotizacion);
      formulario.reset();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, [], formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label="Nueva cotización"
      className="space-y-4 rounded-lg border bg-card p-4"
      onSubmit={(evento) => void formulario.handleSubmit(enviar)(evento)}
    >
      <h2 className="text-lg font-semibold">Nueva cotización</h2>
      <fieldset className="flex items-center gap-4">
        <legend className="mb-2 text-sm font-medium">Moneda de la operación</legend>
        {MONEDAS.map((opcion) => (
          <Label key={opcion} className="flex items-center gap-2">
            <input type="radio" value={opcion} {...formulario.register("moneda")} />
            {opcion}
          </Label>
        ))}
      </fieldset>
      <div className="space-y-2">
        {fields.map((campo, i) => (
          <div key={campo.id} className="flex items-start gap-2">
            <Input
              aria-label="Concepto"
              placeholder="Concepto"
              aria-invalid={Boolean(errors.items?.[i]?.concepto)}
              {...formulario.register(`items.${String(i) as "0"}.concepto`)}
            />
            <Input
              aria-label="Precio"
              placeholder={`Precio (${moneda})`}
              inputMode="decimal"
              className="max-w-40"
              aria-invalid={Boolean(errors.items?.[i]?.precio)}
              {...formulario.register(`items.${String(i) as "0"}.precio`)}
            />
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Quitar ítem ${String(i + 1)}`}
                onClick={() => {
                  remove(i);
                }}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            append({ concepto: "", precio: "" });
          }}
        >
          <Plus aria-hidden="true" /> Agregar ítem
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-md bg-muted p-3">
        <span className="text-sm font-medium">Total calculado</span>
        <span className="text-lg font-semibold">{formatearImporte(total, moneda)}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {meses === undefined
          ? "Vigencia según la configuración de la agencia"
          : `Válida hasta ${formatearFecha(sumarMesesAHoy(meses))}`}
      </p>
      {errors.items && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Cargá al menos un ítem con concepto y precio válidos.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {emitida && (
        <p role="status" className="text-sm font-medium">
          Cotización emitida: <span>{ETIQUETA_ESTADO_COTIZACION[emitida.estado]}</span> ·{" "}
          {formatearImporte(emitida.total, emitida.moneda)} · vigente hasta el{" "}
          {formatearFecha(emitida.validez_hasta)}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        Generar documento
      </Button>
    </form>
  );
}
