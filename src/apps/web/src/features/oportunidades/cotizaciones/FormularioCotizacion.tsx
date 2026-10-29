import { zodResolver } from "@hookform/resolvers/zod";
import {
  ETIQUETA_ESTADO_COTIZACION,
  formatearFecha,
  formatearImporte,
  type Cotizacion,
  type Hotel,
  type Moneda,
  type UsuarioActual,
} from "@rumbo/shared";
import { useConfiguracion, useEmitirCotizacion } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Hotel as IconoHotel, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { BuscadorHoteles } from "./BuscadorHoteles";
import { esquemaCotizacion, type DatosCotizacion } from "./esquemas";
import { importeComoTexto, sumarImportes, sumarMesesAHoy } from "./calculos";

const MONEDAS: Moneda[] = ["ARS", "USD"];
const SUFIJO_REFERENCIA = " (ref. por noche)";

/** Emisión de una cotización (RF-021, RF-022): ítems, moneda, total y vigencia a la vista. */
export function FormularioCotizacion({
  cliente,
  usuario,
  oportunidadId,
  destinoConsultado,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  oportunidadId: string;
  destinoConsultado: string | null;
}) {
  const emitir = useEmitirCotizacion(cliente);
  // Los parámetros del negocio solo los lee la gestión: el resto no ve una fecha estimada.
  const leeConfiguracion = usuario.rol === "admin" || usuario.rol === "dueno";
  const configuracion = useConfiguracion(cliente, { enabled: leeConfiguracion });
  const meses = configuracion.data?.vigencia_cotizacion_meses;
  const [error, setError] = useState<string | null>(null);
  const [emitida, setEmitida] = useState<Cotizacion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const formulario = useForm<DatosCotizacion>({
    resolver: zodResolver(esquemaCotizacion),
    defaultValues: { moneda: "ARS", items: [{ concepto: "", precio: "" }] },
  });
  const { fields, append, update, remove } = useFieldArray({
    control: formulario.control,
    name: "items",
  });
  const registroMoneda = formulario.register("moneda");
  const { errors, isSubmitting } = formulario.formState;
  const moneda = useWatch({ control: formulario.control, name: "moneda" });
  const items = useWatch({ control: formulario.control, name: "items" });
  const total = sumarImportes(items.map((item) => item.precio));

  const elegidos = items.flatMap((item, i) =>
    item.hotel_id ? [{ posicion: i, hotelId: item.hotel_id, nombre: item.hotel_nombre }] : [],
  );

  // El hotel entra como ítem editable; una fila vacía se aprovecha. La referencia del catálogo es en
  // ARS por noche: en USD el precio lo carga el empleado, para no sumar pesos a una cotización en dólares.
  function elegirHotel(hotel: Hotel) {
    const enPesos = moneda === "ARS" && hotel.precio_referencia;
    const precio = enPesos ? (hotel.precio_referencia?.replace(".", ",") ?? "") : "";
    const item = {
      concepto: enPesos ? `${hotel.nombre}${SUFIJO_REFERENCIA}` : hotel.nombre,
      precio,
      precio_autocompletado: precio || undefined,
      hotel_id: hotel.id,
      hotel_nombre: hotel.nombre,
    };
    const vacia = items.findIndex((i) => !i.concepto.trim() && !i.precio.trim());
    if (vacia >= 0) update(vacia, item);
    else append(item);
  }

  // Al pasar a USD, la referencia en ARS ya no vale: se vacían solo los precios que nadie tocó.
  function soltarReferenciasEnPesos() {
    formulario.getValues("items").forEach((item, i) => {
      if (!item.precio_autocompletado || item.precio.trim() !== item.precio_autocompletado) return;
      update(i, {
        ...item,
        concepto: item.concepto.replace(SUFIJO_REFERENCIA, ""),
        precio: "",
        precio_autocompletado: undefined,
      });
    });
  }

  function quitarItem(posicion: number) {
    if (fields.length > 1) remove(posicion);
    else update(posicion, { concepto: "", precio: "" });
  }

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
            <input
              type="radio"
              value={opcion}
              {...registroMoneda}
              onChange={(evento) => {
                void registroMoneda.onChange(evento);
                if (opcion === "USD") soltarReferenciasEnPesos();
              }}
            />
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
        <Button
          type="button"
          variant="outline"
          className="w-full"
          aria-expanded={buscando}
          onClick={() => {
            setBuscando((abierto) => !abierto);
          }}
        >
          <Search aria-hidden="true" /> Buscar hoteles
        </Button>
      </div>
      {buscando && (
        <BuscadorHoteles
          cliente={cliente}
          destinoConsultado={destinoConsultado}
          elegidos={elegidos.map((e) => e.hotelId)}
          alElegir={elegirHotel}
        />
      )}
      {elegidos.length > 0 && (
        <ul aria-label="Hoteles elegidos" className="space-y-1">
          {elegidos.map((e) => (
            <li key={e.hotelId} className="flex items-center gap-2 text-sm">
              <IconoHotel aria-hidden="true" className="size-4" />
              <span>{e.nombre}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Quitar ${e.nombre ?? "hotel"}`}
                onClick={() => {
                  quitarItem(e.posicion);
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
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
          {formatearFecha(emitida.validez_hasta)} · Ítems:{" "}
          {emitida.items.map((item) => item.concepto).join(", ")}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        Generar documento
      </Button>
    </form>
  );
}
