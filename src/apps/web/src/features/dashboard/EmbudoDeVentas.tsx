import { ETIQUETA_ESTADO_OPORTUNIDAD, type Embudo } from "@rumbo/shared";
import { Link } from "react-router";

/** Embudo de oportunidades por etapa (RF-123): barras proporcionales a la etapa más grande. */
export function EmbudoDeVentas({ embudo }: { embudo: Embudo }) {
  const maximo = Math.max(1, ...embudo.etapas.map((e) => e.cantidad));
  const conversion = `Conversión ${String(Math.round(Number(embudo.tasa_conversion) * 100))} %`;
  return (
    <section aria-labelledby="titulo-embudo" className="rounded-2xl border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="titulo-embudo" className="text-lg font-semibold">
          Embudo de ventas
        </h2>
        <p className="text-sm text-muted-foreground">{conversion}</p>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {embudo.etapas.map(({ estado, cantidad }) => (
          <li key={estado}>
            <Link to="/oportunidades" className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0">{ETIQUETA_ESTADO_OPORTUNIDAD[estado]}</span>{" "}
              <span className="h-3 flex-1 rounded-full bg-muted" aria-hidden="true">
                <span
                  className="block h-3 rounded-full bg-primary"
                  style={{ width: `${String((cantidad / maximo) * 100)}%` }}
                />
              </span>
              <span className="w-8 text-right font-medium">{cantidad}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
