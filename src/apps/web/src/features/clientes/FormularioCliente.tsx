import { zodResolver } from "@hookform/resolvers/zod";
import type { Cliente, ClienteEditar } from "@rumbo/shared";
import { esquemaAltaCliente } from "@rumbo/shared/esquemas";
import { useEditarCliente, useUsuarios } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Controller, type Control, type FieldError, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario, CLASE_SELECT } from "../configuracion/CampoFormulario";
import { aplicarErroresDelServidor } from "../configuracion/errores";
import { ETIQUETA_SEGMENTO } from "./segmentos";

// El formato lo fija el esquema del alta; el asesor viaja como texto ("" = sin asesor).
const esquemaFicha = esquemaAltaCliente
  .pick({ nombre: true, contacto: true, instagram: true, segmento: true, preferencias: true })
  .extend({ asesor_asignado_id: z.string() });

type EntradaFicha = z.input<typeof esquemaFicha>;
type DatosFicha = z.output<typeof esquemaFicha>;

const CAMPOS = [
  "nombre",
  "contacto",
  "instagram",
  "segmento",
  "preferencias",
  "asesor_asignado_id",
] as const;

/** Solo los campos que cambiaron respecto de la ficha; es lo que viaja en el PATCH. */
function cambiosDeLaFicha(datos: DatosFicha, ficha: Cliente, conAsesor: boolean): ClienteEditar {
  const nuevo = {
    nombre: datos.nombre,
    contacto: datos.contacto,
    instagram: datos.instagram ?? null,
    segmento: datos.segmento,
    preferencias: datos.preferencias?.trim() || null,
    ...(conAsesor && { asesor_asignado_id: datos.asesor_asignado_id || null }),
  };
  return Object.fromEntries(
    Object.entries(nuevo).filter(([campo, valor]) => ficha[campo as keyof Cliente] !== valor),
  );
}

/** Asesor asignado (RF-150): solo lo pueden listar admin y dueño; el resto no lo ve. */
function SelectorAsesor({
  cliente,
  control,
}: {
  cliente: AxiosInstance;
  control: Control<EntradaFicha, unknown, DatosFicha>;
}) {
  const { data: usuarios, isError } = useUsuarios(cliente, { por_pagina: 100 });
  if (isError) return null;
  return (
    <CampoFormulario id="asesor" etiqueta="Asesor asignado">
      {(props) => (
        <Controller
          control={control}
          name="asesor_asignado_id"
          render={({ field }) => (
            <select className={CLASE_SELECT} {...props} {...field}>
              <option value="">Sin asesor</option>
              {usuarios?.items
                .filter(({ activo }) => activo)
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
  );
}

/** Edición en línea de la ficha (RF-007, CU-03): valida el formato y muestra los 422 de la API. */
export function FormularioCliente({
  cliente,
  ficha,
  conAsesor,
  alTerminar,
}: {
  cliente: AxiosInstance;
  ficha: Cliente;
  conAsesor: boolean;
  alTerminar: () => void;
}) {
  const editar = useEditarCliente(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<EntradaFicha, unknown, DatosFicha>({
    resolver: zodResolver(esquemaFicha),
    defaultValues: {
      nombre: ficha.nombre,
      contacto: ficha.contacto,
      instagram: ficha.instagram ?? "",
      segmento: ficha.segmento,
      preferencias: ficha.preferencias ?? "",
      asesor_asignado_id: ficha.asesor_asignado_id ?? "",
    },
  });
  const { errors } = formulario.formState;

  async function guardar(datos: DatosFicha) {
    setError(null);
    const cambios = cambiosDeLaFicha(datos, ficha, conAsesor);
    if (Object.keys(cambios).length === 0) {
      alTerminar();
      return;
    }
    try {
      await editar.mutateAsync({ id: ficha.id, cambios });
      alTerminar();
    } catch (falla) {
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
      <CampoFormulario id="contacto" etiqueta="Contacto" error={errors.contacto}>
        {(props) => <Input {...props} {...formulario.register("contacto")} />}
      </CampoFormulario>
      <CampoFormulario
        id="instagram"
        etiqueta="Instagram (opcional)"
        error={errors.instagram as FieldError | undefined}
      >
        {(props) => <Input {...props} {...formulario.register("instagram")} />}
      </CampoFormulario>
      <CampoFormulario id="segmento" etiqueta="Segmento" error={errors.segmento}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("segmento")}>
            {Object.entries(ETIQUETA_SEGMENTO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario id="preferencias" etiqueta="Preferencias" error={errors.preferencias}>
        {(props) => (
          <textarea
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
            {...props}
            {...formulario.register("preferencias")}
          />
        )}
      </CampoFormulario>
      {conAsesor && <SelectorAsesor cliente={cliente} control={formulario.control} />}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={editar.isPending}>
          Guardar
        </Button>
        <Button type="button" variant="outline" onClick={alTerminar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
