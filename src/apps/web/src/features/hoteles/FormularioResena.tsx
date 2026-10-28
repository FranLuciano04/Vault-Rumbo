import { zodResolver } from "@hookform/resolvers/zod";
import type { Resena } from "@rumbo/shared";
import { useClientes, useEditarResena, useRegistrarResena } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aplicarErroresDelServidor } from "@/lib/errores";

const PUNTAJE_FUERA_DE_RANGO = "El puntaje es un número entero de 1 a 5.";

const esquemaBase = z.object({
  puntaje: z
    .string()
    .trim()
    .refine((valor) => /^[1-5]$/.test(valor), PUNTAJE_FUERA_DE_RANGO),
  comentario: z.string().trim(),
  fecha: z.string().min(1, "Ingresá la fecha de la reseña."),
});
const esquemaAlta = esquemaBase.extend({ cliente_id: z.string().min(1, "Elegí un cliente.") });
const esquemaEdicion = esquemaBase.extend({ cliente_id: z.string() });

type EntradaResena = z.input<typeof esquemaAlta>;
type CamposResena = z.output<typeof esquemaAlta>;

const CAMPOS = ["cliente_id", "puntaje", "comentario", "fecha"] as const;

function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${String(ahora.getFullYear())}-${mes}-${dia}`;
}

/**
 * Formulario de la reseña (CU-17, pantalla 25): con `resena` corrige puntaje, comentario y fecha
 * (RF-105, `PATCH`); sin ella registra una nueva para el hotel (RF-101, `POST`). Muestra los errores
 * del servidor sin perder lo cargado y avisa con `alTerminar` cuando se guardó.
 */
export function FormularioResena({
  cliente,
  hotelId,
  resena,
  alTerminar,
  alCancelar,
}: {
  cliente: AxiosInstance;
  hotelId: string;
  /** La reseña a editar; sin ella, el formulario registra una nueva. */
  resena?: Resena;
  alTerminar: () => void;
  alCancelar: () => void;
}) {
  const edicion = resena !== undefined;
  const base = resena?.id ?? "nueva";
  const clientes = useClientes(cliente, { por_pagina: 100 });
  const registrar = useRegistrarResena(cliente);
  const editar = useEditarResena(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<EntradaResena, unknown, CamposResena>({
    resolver: zodResolver(edicion ? esquemaEdicion : esquemaAlta),
    defaultValues: {
      cliente_id: "",
      puntaje: resena ? String(resena.puntaje) : "",
      comentario: resena?.comentario ?? "",
      fecha: resena?.fecha ?? hoy(),
    },
  });
  const { errors, isSubmitting } = formulario.formState;

  async function guardar({ cliente_id, puntaje, comentario, fecha }: CamposResena) {
    setError(null);
    try {
      if (resena) {
        await editar.mutateAsync({
          resenaId: resena.id,
          cambios: { puntaje: Number(puntaje), comentario, fecha },
        });
      } else {
        await registrar.mutateAsync({
          hotelId,
          datos: {
            cliente_id,
            puntaje: Number(puntaje),
            fecha,
            ...(comentario && { comentario }),
          },
        });
      }
      alTerminar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      {!edicion && (
        <>
          <CampoFormulario id={`cliente-${base}`} etiqueta="Cliente" error={errors.cliente_id}>
            {(props) => (
              <select
                required
                className={CLASE_SELECT}
                {...props}
                {...formulario.register("cliente_id")}
              >
                <option value="">Elegí un cliente</option>
                {clientes.data?.items.map(({ id, nombre }) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            )}
          </CampoFormulario>
          {/* La reseña desde un viaje se habilita con el módulo de viajes de la web. */}
          <CampoFormulario id={`viaje-${base}`} etiqueta="Viaje (opcional)">
            {(props) => (
              <select disabled className={CLASE_SELECT} {...props}>
                <option value="">Sin viaje</option>
              </select>
            )}
          </CampoFormulario>
        </>
      )}
      <CampoFormulario id={`puntaje-${base}`} etiqueta="Puntaje" error={errors.puntaje}>
        {(props) => (
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={5}
            {...props}
            {...formulario.register("puntaje")}
          />
        )}
      </CampoFormulario>
      <CampoFormulario id={`comentario-${base}`} etiqueta="Comentario" error={errors.comentario}>
        {(props) => <Textarea rows={3} {...props} {...formulario.register("comentario")} />}
      </CampoFormulario>
      <CampoFormulario id={`fecha-${base}`} etiqueta="Fecha" error={errors.fecha}>
        {(props) => <Input type="date" {...props} {...formulario.register("fecha")} />}
      </CampoFormulario>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {edicion ? "Guardar cambios" : "Guardar reseña"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
