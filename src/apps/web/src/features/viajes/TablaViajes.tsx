import { ETIQUETA_ESTADO_VIAJE, formatearFecha, formatearImporte, type Viaje } from "@rumbo/shared";
import { Link } from "react-router";

const ENCABEZADOS = [
  "Destino",
  "Cliente",
  "Salida y regreso",
  "Estado",
  "Saldo pendiente",
  "Pagado",
];

/** Tabla del listado (pantalla 14): cada destino enlaza a la ficha del viaje. */
export function TablaViajes({
  viajes,
  nombreDestino,
  nombreCliente,
}: {
  viajes: Viaje[];
  nombreDestino: (id: string) => string | undefined;
  nombreCliente: (id: string) => string | undefined;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="bg-muted text-muted-foreground">
          {ENCABEZADOS.map((titulo) => (
            <th
              key={titulo}
              scope="col"
              className="px-3 py-2 font-medium first:rounded-l-lg last:rounded-r-lg"
            >
              {titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {viajes.map((v) => (
          <tr key={v.id} className="border-b last:border-b-0 hover:bg-accent">
            <td className="px-3 py-3">
              <Link to={`/viajes/${v.id}`} className="font-medium hover:underline">
                {nombreDestino(v.destino_id) ?? "Viaje"}
              </Link>
            </td>
            <td className="px-3 py-3">{nombreCliente(v.cliente_id)}</td>
            <td className="px-3 py-3 tabular-nums">
              {formatearFecha(v.fecha_salida)} – {formatearFecha(v.fecha_regreso)}
            </td>
            <td className="px-3 py-3">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {ETIQUETA_ESTADO_VIAJE[v.estado]}
              </span>
            </td>
            <td className="px-3 py-3 tabular-nums">
              {formatearImporte(v.saldo_pendiente, v.moneda)}
            </td>
            <td className="px-3 py-3 tabular-nums">
              {Math.round(Number(v.porcentaje_pagado) * 100)} %
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
