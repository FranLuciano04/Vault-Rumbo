import { zodResolver } from "@hookform/resolvers/zod";
import { ETIQUETA_SEGMENTO, type Cliente, type ClienteEditar } from "@rumbo/shared";
import { esquemaAltaCliente } from "@rumbo/shared/esquemas";
import { useAsesores, useEditarCliente } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useState } from "react";
import { Controller, type Control, type FieldError, useForm, useFormState } from "react-hook-form";
import { z } from "zod";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { EditorEtiquetas } from "./EditorEtiquetas";

// El formato lo fija el esquema del alta; el asesor viaja como texto ("" = sin asesor).
export const esquemaFicha = esquemaAltaCliente
  .pick({ nombre: true, contacto: true, instagram: true, segmento: true, preferencias: true })
  .extend({ asesor_asignado_id: z.string() });

export type EntradaFicha = z.input<typeof esquemaFicha>;
export type DatosFicha = z.output<typeof esquemaFicha>;

export const CAMPOS = [
  "nombre",
  "contacto",
  "instagram",
  "segmento",
  "preferencias",
  "asesor_asignado_id",
] as const;

/** Los datos del formulario como los espera la API, en el alta y en la edición. */
export function datosParaLaApi(datos: DatosFicha, conAsesor: boolean) {
  return {
    nombre: datos.nombre,
    contacto: datos.contacto,
    instagram: datos.instagram ?? null,
    segmento: datos.segmento,
    preferencias: datos.preferencias?.trim() || null,
    ...(conAsesor && { asesor_asignado_id: datos.asesor_asignado_id || null }),
  };
}

/** Solo los campos que cambiaron respecto de la ficha; es lo que viaja en el PATCH. */
function cambiosDeLaFicha(
  datos: DatosFicha,
  etiquetas: string[],
  ficha: Cliente,
  conAsesor: boolean,
): ClienteEditar {
  const nuevo = datosParaLaApi(datos, conAsesor);
  const cambios: ClienteEditar = Object.fromEntries(
    Object.entries(nuevo).filter(([campo, valor]) => ficha[campo as keyof Cliente] !== valor),
  );
  if (etiquetas.join("\n") !== ficha.etiquetas.join("\n")) cambios.etiquetas = etiquetas;
  return cambios;
}

/** Asesor asignado (RF-150): lo ven admin, dueño y empleado; el de baja se conserva como opción. */
export function SelectorAsesor({
  cliente,
  actual,
  control,
}: {
  cliente: AxiosInstance;
  actual: Cliente["asesor"];
  control: Control<EntradaFicha, unknown, DatosFicha>;
}) {
  const { data: asesores, isError } = useAsesores(cliente);
  const { errors } = useFormState({ control, name: "asesor_asignado_id" });
  if (isError) return null;
  const deBaja = asesores && actual && !asesores.some(({ id }) => id === actual.id);
  return (
    <CampoFormulario id="asesor" etiqueta="Asesor asignado" error={errors.asesor_asignado_id}>
      {(props) => (
        <Controller
          control={control}
          name="asesor_asignado_id"
          render={({ field }) => (
            <select className={CLASE_SELECT} {...props} {...field}>
              <option value="">Sin asesor</option>
              {deBaja && <option value={actual.id}>{`${actual.nombre} (de baja)`}</option>}
              {asesores?.map(({ id, nombre }) => (
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
  /** `guardo` es verdadero solo si hubo cambios y el servidor los aceptó. */
  alTerminar: (guardo: boolean) => void;
}) {
  const editar = useEditarCliente(cliente);
  const [error, setError] = useState<string | null>(null);
  // La ficha tal como estaba al abrir la edición: si se refresca mientras se edita, el PATCH
  // compara contra lo que la persona vio y no pisa los cambios de otra.
  const [fichaAlAbrir] = useState(ficha);
  const [etiquetas, setEtiquetas] = useState(fichaAlAbrir.etiquetas);
  const formulario = useForm<EntradaFicha, unknown, DatosFicha>({
    resolver: zodResolver(esquemaFicha),
    defaultValues: {
      nombre: fichaAlAbrir.nombre,
      contacto: fichaAlAbrir.contacto,
      instagram: fichaAlAbrir.instagram ?? "",
      segmento: fichaAlAbrir.segmento,
      preferencias: fichaAlAbrir.preferencias ?? "",
      asesor_asignado_id: fichaAlAbrir.asesor_asignado_id ?? "",
    },
  });
  const { errors } = formulario.formState;
  const { setFocus } = formulario;

  // Al abrir, el foco va al primer campo.
  useEffect(() => {
    setFocus("nombre");
  }, [setFocus]);

  async function guardar(datos: DatosFicha) {
    setError(null);
    const cambios = cambiosDeLaFicha(datos, etiquetas, fichaAlAbrir, conAsesor);
    if (Object.keys(cambios).length === 0) {
      alTerminar(false);
      return;
    }
    try {
      await editar.mutateAsync({ id: ficha.id, cambios });
      alTerminar(true);
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
      <EditorEtiquetas etiquetas={etiquetas} alCambiar={setEtiquetas} />
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
      {conAsesor && (
        <SelectorAsesor cliente={cliente} actual={ficha.asesor} control={formulario.control} />
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={editar.isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            alTerminar(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
