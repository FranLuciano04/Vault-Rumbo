import { formatearImporte, type MontoPorMoneda } from "@rumbo/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * Importes por moneda sin convertir, uno por línea (o seguidos, con `enLinea`); sin importes
 * muestra cero en ARS.
 */
export function Importes({
  montos,
  enLinea = false,
}: {
  montos: readonly MontoPorMoneda[];
  enLinea?: boolean;
}) {
  const lineas = montos.length > 0 ? montos : [{ moneda: "ARS" as const, monto: "0.00" }];
  return (
    <>
      {lineas.map(({ moneda, monto }, i) => (
        <span key={moneda} className={enLinea ? undefined : "block"}>
          {enLinea && i > 0 && " · "}
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
