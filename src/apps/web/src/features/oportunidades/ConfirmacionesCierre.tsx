import { zodResolver } from "@hookform/resolvers/zod";
import { ETIQUETA_MOTIVO_PERDIDA, type MotivoPerdida, type OportunidadPerder } from "@rumbo/shared";
import { useForm, useWatch } from "react-hook-form";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { esquemaPerder, type DatosPerder } from "./esquemas";

const MOTIVOS = Object.entries(ETIQUETA_MOTIVO_PERDIDA) as [MotivoPerdida, string][];

const CLASE_PANEL = "flex flex-col gap-3 rounded-2xl border bg-card p-4";

/** Confirmación de ganar (RF-016), la misma en el detalle y en el embudo. */
export function ConfirmarGanar({
  pendiente,
  alConfirmar,
  alCancelar,
}: {
  pendiente: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  return (
    <div role="group" aria-label="Ganar la oportunidad" className={CLASE_PANEL}>
      <p className="text-sm">¿Confirmás que la oportunidad se ganó? No se puede deshacer.</p>
      <div className="flex gap-2">
        <Button disabled={pendiente} onClick={alConfirmar}>
          Confirmar
        </Button>
        <Button variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Formulario del motivo al perder (RF-017), el mismo en el detalle y en el embudo. */
export function FormularioPerder({
  pendiente,
  alConfirmar,
  alCancelar,
}: {
  pendiente: boolean;
  alConfirmar: (datos: OportunidadPerder) => void;
  alCancelar: () => void;
}) {
  const formulario = useForm<DatosPerder>({
    resolver: zodResolver(esquemaPerder),
    defaultValues: { motivo_perdida: "" as MotivoPerdida, motivo_perdida_detalle: "" },
  });
  const { errors, isSubmitting } = formulario.formState;
  const motivoElegido = useWatch({ control: formulario.control, name: "motivo_perdida" });

  return (
    <form
      noValidate
      aria-label="Perder la oportunidad"
      className={CLASE_PANEL}
      onSubmit={(evento) =>
        void formulario.handleSubmit(({ motivo_perdida, motivo_perdida_detalle }) => {
          alConfirmar({
            motivo_perdida,
            ...(motivo_perdida === "otro" && { motivo_perdida_detalle }),
          });
        })(evento)
      }
    >
      <CampoFormulario
        id="motivo-perdida"
        etiqueta="Motivo"
        error={errors.motivo_perdida}
        anunciarError
      >
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
        <Button type="submit" disabled={isSubmitting || pendiente}>
          Confirmar
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
