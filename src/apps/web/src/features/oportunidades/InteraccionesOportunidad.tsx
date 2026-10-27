import { zodResolver } from "@hookform/resolvers/zod";
import { formatearFecha, type Oportunidad, type UsuarioActual } from "@rumbo/shared";
import { useEditarOportunidad } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mensajeDeError } from "@/lib/errores";
import { esquemaInteraccion, type DatosInteraccion } from "./esquemas";

const SALTO = "\n";

/**
 * Interacciones de la oportunidad (RF-014): cada línea de las notas es un ítem y registrar una
 * agrega al final `dd/mm/aa — <nombre>: <texto>`.
 */
export function InteraccionesOportunidad({
  cliente,
  usuario,
  oportunidad,
  puedeRegistrar,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  oportunidad: Oportunidad;
  puedeRegistrar: boolean;
}) {
  const editar = useEditarOportunidad(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosInteraccion>({
    resolver: zodResolver(esquemaInteraccion),
    defaultValues: { texto: "" },
  });
  const notas = oportunidad.notas ?? "";
  // Las líneas en blanco no son ítems: se filtran solo al mostrar; las notas guardadas quedan intactas.
  const lineas = notas.split(SALTO).filter((linea) => linea.trim() !== "");

  async function registrar({ texto }: DatosInteraccion) {
    setError(null);
    // Un salto de línea partiría la interacción en varios ítems: va en una sola línea.
    const unaLinea = texto.replace(/\s*\n\s*/g, " ");
    const entrada = `${formatearFecha(new Date().toISOString())} — ${usuario.nombre}: ${unaLinea}`;
    try {
      await editar.mutateAsync({
        oportunidadId: oportunidad.id,
        cambios: { notas: notas ? `${notas}${SALTO}${entrada}` : entrada },
      });
      formulario.reset();
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  return (
    <section aria-labelledby="titulo-interacciones" className="space-y-3">
      <h2 id="titulo-interacciones" className="text-lg font-semibold">
        Interacciones
      </h2>
      {lineas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay interacciones registradas.</p>
      ) : (
        <ul className="space-y-2">
          {lineas.map((linea, i) => (
            <li key={`${String(i)}-${linea}`} className="rounded-lg border bg-card p-3 text-sm">
              {linea}
            </li>
          ))}
        </ul>
      )}
      {puedeRegistrar && (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(evento) => void formulario.handleSubmit(registrar)(evento)}
        >
          <CampoFormulario
            id="interaccion"
            etiqueta="Interacción"
            error={formulario.formState.errors.texto}
          >
            {(props) => <Textarea {...props} {...formulario.register("texto")} />}
          </CampoFormulario>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="self-start" disabled={formulario.formState.isSubmitting}>
            Registrar interacción
          </Button>
        </form>
      )}
    </section>
  );
}
