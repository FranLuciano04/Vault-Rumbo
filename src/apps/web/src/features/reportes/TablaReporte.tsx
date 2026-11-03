import { formatearImporte, type ColumnaReporte, type Reporte } from "@rumbo/shared";

type Fila = Reporte["filas"][number];

/** Valor de una celda según su columna: importe en su moneda, margen en %, mes `mm/aa` (RNF-16). */
function textoCelda(columna: ColumnaReporte, valor: Fila[string] | undefined): string {
  if (valor === null || valor === undefined) return "—";
  const texto = String(valor);
  if (columna.tipo === "importe" && columna.moneda) return formatearImporte(texto, columna.moneda);
  if (columna.clave.startsWith("margen_")) return `${texto.replace(".", ",")} %`;
  const mes = /^(\d{4})-(\d{2})$/.exec(texto);
  if (columna.clave === "mes" && mes) return `${mes[2] ?? ""}/${(mes[1] ?? "").slice(2)}`;
  return texto;
}

/** Tabla de un período del reporte: las columnas las define la API; los importes van a la derecha. */
export function TablaReporte({
  nombre,
  columnas,
  filas,
}: {
  nombre: string;
  columnas: readonly ColumnaReporte[];
  filas: readonly Fila[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table aria-label={nombre} className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={`px-3 py-2 font-medium ${c.tipo === "texto" ? "" : "text-right"}`}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-t">
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  className={`px-3 py-2 ${c.tipo === "texto" ? "" : "text-right tabular-nums"}`}
                >
                  {textoCelda(c, fila[c.clave])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
