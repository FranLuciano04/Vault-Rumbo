import { zodResolver } from "@hookform/resolvers/zod";
import type { ContenidoRed } from "@rumbo/shared";
import { canalesContenido, esquemaContenido, type DatosContenido } from "@rumbo/shared/esquemas";
import { useCrearContenido, useEditarContenido } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { ETIQUETA_CANAL } from "./etiquetas";

const CAMPOS = ["titulo", "texto", "canal", "fecha_publicacion"] as const;

/** Alta (RF-113) y edición o reprogramación (RF-115, RF-116) de una pieza de contenido. */
export function FormularioContenido({
  cliente,
  pieza,
  alCerrar,
}: {
  cliente: AxiosInstance;
  /** La pieza a editar; sin ella, el formulario da de alta una nueva en la columna idea. */
  pieza?: ContenidoRed;
  alCerrar: () => void;
}) {
  const crear = useCrearContenido(cliente);
  const editar = useEditarContenido(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosContenido>({
    resolver: zodResolver(esquemaContenido),
    defaultValues: {
      titulo: pieza?.titulo ?? "",
      texto: pieza?.texto ?? "",
      canal: pieza?.canal,
      fecha_publicacion: pieza?.fecha_publicacion ?? "",
    },
  });
  const { errors, isSubmitting } = formulario.formState;

  async function guardar({ texto, ...datos }: DatosContenido) {
    setError(null);
    const cuerpo = { ...datos, texto: texto || null };
    try {
      if (pieza) await editar.mutateAsync({ contenidoId: pieza.id, cambios: cuerpo });
      else await crear.mutateAsync(cuerpo);
      alCerrar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={pieza ? "Editar pieza" : "Alta de pieza"}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <CampoFormulario id="contenido-titulo" etiqueta="Título" error={errors.titulo}>
        {(props) => <Input {...props} {...formulario.register("titulo")} />}
      </CampoFormulario>
      <CampoFormulario id="contenido-texto" etiqueta="Texto (opcional)" error={errors.texto}>
        {(props) => <Textarea {...props} {...formulario.register("texto")} />}
      </CampoFormulario>
      <CampoFormulario id="contenido-canal" etiqueta="Canal" error={errors.canal}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("canal")}>
            <option value="">Elegí un canal</option>
            {canalesContenido.map((canal) => (
              <option key={canal} value={canal}>
                {ETIQUETA_CANAL[canal]}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario
        id="contenido-fecha"
        etiqueta="Fecha de publicación"
        error={errors.fecha_publicacion}
      >
        {(props) => <Input type="date" {...props} {...formulario.register("fecha_publicacion")} />}
      </CampoFormulario>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {pieza ? "Guardar" : "Crear"}
        </Button>
        <Button variant="outline" onClick={alCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
