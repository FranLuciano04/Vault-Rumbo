import { zodResolver } from "@hookform/resolvers/zod";
import { formatearFecha, type EstadoAlerta } from "@rumbo/shared";
import { useAgendarInsistencia, useAlertas } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { esquemaInsistencia, type DatosInsistencia } from "./esquemas";

const CAMPOS = ["fecha", "descripcion"] as const;
const ETIQUETA_ESTADO: Partial<Record<EstadoAlerta, string>> = {
  pendiente: "Pendiente",
  resuelta: "Atendida",
};

/** Insistencias de la oportunidad (RF-015): las pendientes y las atendidas, y el alta de una nueva. */
export function InsistenciasOportunidad({
  cliente,
  oportunidadId,
  puedeAgendar,
}: {
  cliente: AxiosInstance;
  oportunidadId: string;
  puedeAgendar: boolean;
}) {
  const filtros = { oportunidad_id: oportunidadId, tipo: "insistencia" } as const;
  const pendientes = useAlertas(cliente, { ...filtros, estado: "pendiente" });
  const atendidas = useAlertas(cliente, { ...filtros, estado: "resuelta" });
  const agendar = useAgendarInsistencia(cliente);
  const [abierto, setAbierto] = useState(false);
  const [agendada, setAgendada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosInsistencia>({
    resolver: zodResolver(esquemaInsistencia),
    defaultValues: { fecha: "", descripcion: "" },
  });
  const { errors, isSubmitting } = formulario.formState;
  const insistencias = [...(pendientes.data?.items ?? []), ...(atendidas.data?.items ?? [])];

  async function enviar(datos: DatosInsistencia) {
    setError(null);
    try {
      await agendar.mutateAsync({ oportunidadId, datos });
      formulario.reset();
      setAbierto(false);
      setAgendada(true);
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <section aria-labelledby="titulo-insistencias" className="space-y-3">
      <h2 id="titulo-insistencias" className="text-lg font-semibold">
        Insistencias
      </h2>
      {pendientes.isError || atendidas.isError ? (
        <p role="alert" className="text-sm text-destructive">
          No pudimos cargar las insistencias.
        </p>
      ) : insistencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay insistencias agendadas.</p>
      ) : (
        <ul className="space-y-2">
          {insistencias.map((alerta) => (
            <li
              key={alerta.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm"
            >
              <span>
                {formatearFecha(alerta.fecha)} — {alerta.descripcion}
              </span>
              <span className="text-muted-foreground">{ETIQUETA_ESTADO[alerta.estado]}</span>
            </li>
          ))}
        </ul>
      )}
      {agendada && (
        <p role="status" className="text-sm text-muted-foreground">
          Insistencia agendada.
        </p>
      )}
      {puedeAgendar && !abierto && (
        <Button
          variant="outline"
          onClick={() => {
            setAgendada(false);
            setAbierto(true);
          }}
        >
          Agendar insistencia
        </Button>
      )}
      {puedeAgendar && abierto && (
        <form
          noValidate
          aria-label="Agendar insistencia"
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
          onSubmit={(evento) => void formulario.handleSubmit(enviar)(evento)}
        >
          <CampoFormulario id="insistencia-fecha" etiqueta="Fecha" error={errors.fecha}>
            {(props) => <Input type="date" {...props} {...formulario.register("fecha")} />}
          </CampoFormulario>
          <CampoFormulario
            id="insistencia-descripcion"
            etiqueta="Descripción"
            error={errors.descripcion}
          >
            {(props) => <Input {...props} {...formulario.register("descripcion")} />}
          </CampoFormulario>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAbierto(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
