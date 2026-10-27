import { zodResolver } from "@hookform/resolvers/zod";
import {
  ETIQUETA_MOTIVO_PERDIDA,
  type EstadoOportunidad,
  type MotivoPerdida,
  type Oportunidad,
} from "@rumbo/shared";
import {
  useGanarOportunidad,
  usePerderOportunidad,
  useReactivarOportunidad,
  useTomarOportunidad,
} from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensajeDeError } from "@/lib/errores";
import { esquemaPerder, type DatosPerder } from "./esquemas";

/** Acciones que admite cada estado (EST-Oportunidad). */
const ADMITE: Record<
  EstadoOportunidad,
  { enGestion: boolean; ganar: boolean; perder: boolean; reactivar: boolean }
> = {
  nueva: { enGestion: true, ganar: true, perder: true, reactivar: false },
  en_gestion: { enGestion: false, ganar: true, perder: true, reactivar: false },
  cotizada: { enGestion: false, ganar: true, perder: true, reactivar: false },
  ganada: { enGestion: false, ganar: false, perder: false, reactivar: false },
  perdida: { enGestion: false, ganar: false, perder: false, reactivar: true },
};

const MOTIVOS = Object.entries(ETIQUETA_MOTIVO_PERDIDA) as [MotivoPerdida, string][];

/** Cambios de estado de la oportunidad (RF-016, RF-017, RF-020); los 409 se explican con el `detail` de la API. */
export function AccionesOportunidad({
  cliente,
  oportunidad,
}: {
  cliente: AxiosInstance;
  oportunidad: Oportunidad;
}) {
  const tomar = useTomarOportunidad(cliente);
  const ganar = useGanarOportunidad(cliente);
  const perder = usePerderOportunidad(cliente);
  const reactivar = useReactivarOportunidad(cliente);
  const [perdiendo, setPerdiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosPerder>({
    resolver: zodResolver(esquemaPerder),
    defaultValues: { motivo_perdida: "" as MotivoPerdida, motivo_perdida_detalle: "" },
  });
  const { errors, isSubmitting } = formulario.formState;
  const motivoElegido = useWatch({ control: formulario.control, name: "motivo_perdida" });
  const admite = ADMITE[oportunidad.estado];

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);
    try {
      await accion();
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  async function confirmarPerder({ motivo_perdida, motivo_perdida_detalle }: DatosPerder) {
    await ejecutar(async () => {
      await perder.mutateAsync({
        oportunidadId: oportunidad.id,
        datos: {
          motivo_perdida,
          ...(motivo_perdida === "otro" && { motivo_perdida_detalle }),
        },
      });
      setPerdiendo(false);
      formulario.reset();
    });
  }

  return (
    <section aria-label="Acciones" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {admite.enGestion && (
          <Button
            variant="outline"
            onClick={() => void ejecutar(() => tomar.mutateAsync(oportunidad.id))}
          >
            Pasar a en gestión
          </Button>
        )}
        {admite.ganar && (
          <Button onClick={() => void ejecutar(() => ganar.mutateAsync(oportunidad.id))}>
            Ganar
          </Button>
        )}
        {admite.perder && !perdiendo && (
          <Button
            variant="outline"
            onClick={() => {
              setPerdiendo(true);
            }}
          >
            Perder
          </Button>
        )}
        {admite.reactivar && (
          <Button onClick={() => void ejecutar(() => reactivar.mutateAsync(oportunidad.id))}>
            Reactivar
          </Button>
        )}
      </div>
      {admite.perder && perdiendo && (
        <form
          noValidate
          aria-label="Perder la oportunidad"
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
          onSubmit={(evento) => void formulario.handleSubmit(confirmarPerder)(evento)}
        >
          <CampoFormulario id="motivo-perdida" etiqueta="Motivo" error={errors.motivo_perdida}>
            {(props) => (
              <select
                required
                className={CLASE_SELECT}
                {...props}
                {...formulario.register("motivo_perdida")}
              >
                <option value="">Elegí un motivo</option>
                {MOTIVOS.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            )}
          </CampoFormulario>
          {motivoElegido === "otro" && (
            <CampoFormulario
              id="motivo-detalle"
              etiqueta="Detalle"
              error={errors.motivo_perdida_detalle}
            >
              {(props) => <Input {...props} {...formulario.register("motivo_perdida_detalle")} />}
            </CampoFormulario>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              Confirmar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPerdiendo(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
