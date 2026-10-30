import { formatearImporte, type MontoPorMoneda } from "@rumbo/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";

/** Importes por moneda, uno por línea y sin convertir; sin importes muestra cero en ARS. */
export function Importes({ montos }: { montos: readonly MontoPorMoneda[] }) {
  const lineas = montos.length > 0 ? montos : [{ moneda: "ARS" as const, monto: "0.00" }];
  return (
    <>
      {lineas.map(({ moneda, monto }) => (
        <span key={moneda} className="block">
          {formatearImporte(monto, moneda)}
        </span>
      ))}
    </>
  );
}

/** Indicador del tablero; con `ruta` es un enlace a la pantalla donde se ve el detalle. */
export function TarjetaIndicador({
  titulo,
  ruta,
  children,
}: {
  titulo: string;
  ruta?: string;
  children: ReactNode;
}) {
  const contenido = (
    <>
      <span className="block text-sm text-muted-foreground">{titulo}</span>
      <span className="mt-1 block text-2xl font-semibold">{children}</span>
    </>
  );
  const clases = "block rounded-2xl border bg-card p-4";
  return ruta ? (
    <Link to={ruta} className={`${clases} hover:bg-accent`}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}
