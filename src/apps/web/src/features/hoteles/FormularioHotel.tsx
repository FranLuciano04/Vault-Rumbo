import { zodResolver } from "@hookform/resolvers/zod";
import { CATEGORIAS_HOTEL, ErrorApi, SERVICIOS_HOTEL, type Hotel } from "@rumbo/shared";
import { useDestinos } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button, variantesBoton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";

/** Importe decimal como lo manda la API: «150000» o «150000.50». */
const PRECIO_VALIDO = /^\d+(\.\d{1,2})?$/;

const esquemaHotel = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre.").max(120, "Usá hasta 120 caracteres."),
  destino_id: z.string().min(1, "Elegí un destino."),
  categoria: z.string(),
  precio_referencia: z
    .string()
    .trim()
    .refine((precio) => precio === "" || PRECIO_VALIDO.test(precio), "Ingresá un importe válido."),
});

type EntradaHotel = z.input<typeof esquemaHotel>;
type CamposHotel = z.output<typeof esquemaHotel>;

/** Lo que el formulario entrega al guardar: los campos validados y los servicios marcados. */
export type DatosHotel = CamposHotel & { servicios: string[] };

const CAMPOS = ["nombre", "destino_id", "categoria", "precio_referencia"] as const;

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Formulario del hotel, común al alta y la edición (CU-16, pantalla 23): valida el formato, muestra
 * los 422 en su campo y el 409 de duplicado con el hotel existente, sin permitir forzar el alta.
 */
export function FormularioHotel({
  cliente,
  hotel,
  textoEnviar,
  enviar,
}: {
  cliente: AxiosInstance;
  /** El hotel a editar; sin él, el formulario arranca vacío (alta). */
  hotel?: Hotel;
  textoEnviar: string;
  /** Guarda los datos; si falla, el formulario muestra el error del servidor. */
  enviar: (datos: DatosHotel) => Promise<void>;
}) {
  const { data: destinos } = useDestinos(cliente, { por_pagina: 100 });
  const [servicios, setServicios] = useState<string[]>(hotel?.servicios ?? []);
  const [error, setError] = useState<string | null>(null);
  const [existente, setExistente] = useState<ErrorApi["existente"]>();
  const formulario = useForm<EntradaHotel, unknown, CamposHotel>({
    resolver: zodResolver(esquemaHotel),
    defaultValues: {
      nombre: hotel?.nombre ?? "",
      destino_id: hotel?.destino_id ?? "",
      categoria: hotel?.categoria ?? "",
      precio_referencia: hotel?.precio_referencia ?? "",
    },
  });
  const { errors, isSubmitting } = formulario.formState;
  const { setFocus } = formulario;

  useEffect(() => {
    setFocus("nombre");
  }, [setFocus]);

  function alternarServicio(servicio: string) {
    setServicios((marcados) =>
      marcados.includes(servicio)
        ? marcados.filter((marcado) => marcado !== servicio)
        : [...marcados, servicio],
    );
  }

  async function guardar(datos: CamposHotel) {
    setError(null);
    setExistente(undefined);
    try {
      await enviar({ ...datos, servicios });
    } catch (falla) {
      if (falla instanceof ErrorApi && falla.status === 409 && falla.existente) {
        setExistente(falla.existente);
      }
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <CampoFormulario id="nombre" etiqueta="Nombre" error={errors.nombre}>
        {(props) => <Input {...props} {...formulario.register("nombre")} />}
      </CampoFormulario>
      <CampoFormulario id="destino" etiqueta="Destino" error={errors.destino_id}>
        {(props) => (
          <Controller
            control={formulario.control}
            name="destino_id"
            render={({ field }) => (
              <select className={CLASE_SELECT} {...props} {...field}>
                <option value="">Elegí un destino</option>
                {destinos?.items
                  .filter(({ activo, id }) => activo || id === hotel?.destino_id)
                  .map(({ id, nombre }) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
              </select>
            )}
          />
        )}
      </CampoFormulario>
      <CampoFormulario id="categoria" etiqueta="Categoría (opcional)" error={errors.categoria}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("categoria")}>
            <option value="">Sin categoría</option>
            {CATEGORIAS_HOTEL.map((categoria) => (
              <option key={categoria}>{categoria}</option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario
        id="precio"
        etiqueta="Precio de referencia (opcional)"
        error={errors.precio_referencia}
      >
        {(props) => (
          <Input
            inputMode="decimal"
            placeholder="Por noche, en ARS"
            {...props}
            {...formulario.register("precio_referencia")}
          />
        )}
      </CampoFormulario>
      <div role="group" aria-label="Servicios" className="flex flex-wrap items-center gap-2">
        {SERVICIOS_HOTEL.map((servicio) => {
          const marcado = servicios.includes(servicio);
          return (
            <Button
              key={servicio}
              type="button"
              size="sm"
              className="rounded-full"
              variant={marcado ? "default" : "outline"}
              aria-pressed={marcado}
              onClick={() => {
                alternarServicio(servicio);
              }}
            >
              {capitalizar(servicio)}
            </Button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
          {existente && (
            <>
              {" "}
              Hotel existente: «{existente.nombre}».{" "}
              <Link to={`/hoteles/${existente.id}/editar`} className="underline">
                Abrir el hotel existente
              </Link>
            </>
          )}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {textoEnviar}
        </Button>
        <Link to="/hoteles" className={variantesBoton({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
