import { formatearImporte, type VentaMensual } from "@rumbo/shared";

const MONEDAS = ["ARS", "USD"] as const;

/** «oct. 26» a partir del primer día del mes (`aaaa-mm-dd`). */
const etiquetaMes = (mes: string) =>
  new Date(`${mes}T00:00:00Z`).toLocaleDateString("es-AR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });

/** Ventas de los últimos meses (RF-128): una barra por mes y una serie por moneda, sin sumarlas. */
export function VentasPorMes({ meses }: { meses: readonly VentaMensual[] }) {
  const series = MONEDAS.map((moneda) => ({
    moneda,
    puntos: meses.flatMap(({ mes, ventas }) => {
      const monto = ventas.find((v) => v.moneda === moneda)?.monto;
      return monto === undefined ? [] : [{ mes, monto }];
    }),
  })).filter(({ puntos }) => puntos.length > 0);

  return (
    <section aria-labelledby="titulo-ventas-mes" className="rounded-2xl border bg-card p-4">
      <h2 id="titulo-ventas-mes" className="text-lg font-semibold">
        Ventas por mes
      </h2>
      {series.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Todavía no hay ventas por mes.</p>
      )}
      {series.map(({ moneda, puntos }) => {
        const maximo = Math.max(...puntos.map((p) => Number(p.monto)), 1);
        return (
          <div key={moneda} className="mt-3">
            <p className="text-xs text-muted-foreground">Ventas en {moneda}</p>
            <ul className="mt-1 flex h-36 items-end gap-3">
              {puntos.map(({ mes, monto }) => (
                <li
                  key={mes}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1 text-xs"
                >
                  <span className="text-center">{formatearImporte(monto, moneda)}</span>
                  <span
                    aria-hidden="true"
                    className="w-full rounded-t-md bg-primary"
                    style={{ height: `${String((Number(monto) / maximo) * 60)}%` }}
                  />
                  <span className="text-muted-foreground">{etiquetaMes(mes)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
