import { DESTINO_A_DEFINIR, ETIQUETA_ESTADO_OPORTUNIDAD, type Oportunidad } from "@rumbo/shared";
import { TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";

/**
 * Aviso de oportunidad abierta (CU-04 A2, RF-012): el cliente ya tiene una en curso. Se puede ir
 * a ella o confirmar que la consulta es otra.
 */
export function AvisoOportunidadAbierta({
  abiertas,
  enviando,
  alRegistrarIgual,
}: {
  abiertas: Oportunidad[];
  enviando: boolean;
  alRegistrarIgual: () => void;
}) {
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        Este cliente ya tiene una oportunidad abierta
      </h2>
      <ul className="flex flex-col gap-2">
        {abiertas.map(({ id, destino_consultado, estado }) => (
          <li key={id} className="flex items-center justify-between gap-3">
            <span>
              <span className="font-medium">{destino_consultado ?? DESTINO_A_DEFINIR}</span> ·{" "}
              {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}
            </span>
            <Link to={`/oportunidades/${id}`} className={variantesBoton({ variant: "outline" })}>
              Ir a la oportunidad
            </Link>
          </li>
        ))}
      </ul>
      <div>
        <Button type="button" disabled={enviando} onClick={alRegistrarIgual}>
          Registrar igual
        </Button>
      </div>
    </section>
  );
}
