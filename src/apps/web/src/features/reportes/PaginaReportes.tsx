import { formatearFecha, type UsuarioActual } from "@rumbo/shared";
import { descargarReporte, useReporte, useReportes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { TablaReporte } from "./TablaReporte";

const TIPO_ARCHIVO = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Primer y último día del mes en curso, como `YYYY-MM-DD`. */
function mesEnCurso() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const ultimo = new Date(anio, mes, 0).getDate();
  const prefijo = `${String(anio)}-${dosDigitos(mes)}`;
  return { desde: `${prefijo}-01`, hasta: `${prefijo}-${dosDigitos(ultimo)}` };
}

/** Descarga el archivo del reporte mediante un enlace temporal. */
async function guardarArchivo(
  cliente: AxiosInstance,
  reporteId: string,
  formato: keyof typeof TIPO_ARCHIVO,
  filtros: { desde: string; hasta: string; comparar_desde?: string; comparar_hasta?: string },
) {
  const url = URL.createObjectURL(
    new Blob([await descargarReporte(cliente, reporteId, formato, filtros)], {
      type: TIPO_ARCHIVO[formato],
    }),
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${reporteId}.${formato}`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function CampoFecha({
  id,
  etiqueta,
  valor,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        type="date"
        value={valor}
        onChange={(e) => {
          alCambiar(e.target.value);
        }}
      />
    </div>
  );
}

/**
 * Reportes (CU-22, pantalla 29): el admin y el dueño eligen un reporte del catálogo y un período,
 * lo comparan con otro y lo descargan en Excel o PDF. El cálculo es del backend.
 */
export function PaginaReportes({ cliente }: { cliente: AxiosInstance; usuario: UsuarioActual }) {
  const [elegido, setElegido] = useState("");
  const [periodo, setPeriodo] = useState(mesEnCurso);
  const [compara, setCompara] = useState(false);
  const [comparado, setComparado] = useState({ desde: "", hasta: "" });
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const catalogo = useReportes(cliente);
  const reporteId = elegido || catalogo.data?.[0]?.id || "";
  const comparando = compara && comparado.desde !== "" && comparado.hasta !== "";
  const filtros = {
    desde: periodo.desde,
    hasta: periodo.hasta,
    ...(comparando && { comparar_desde: comparado.desde, comparar_hasta: comparado.hasta }),
  };
  const reporte = useReporte(cliente, reporteId, filtros);
  const { data } = reporte;

  async function descargar(formato: keyof typeof TIPO_ARCHIVO) {
    setErrorDescarga(null);
    try {
      await guardarArchivo(cliente, reporteId, formato, filtros);
    } catch (falla) {
      setErrorDescarga(mensajeDeError(falla));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Marketing y análisis
        </p>
        <h1 className="text-3xl font-semibold">Reportes</h1>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="reporte-id">Reporte</Label>
          <select
            id="reporte-id"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={reporteId}
            onChange={(e) => {
              setElegido(e.target.value);
            }}
          >
            {catalogo.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <CampoFecha
          id="reporte-desde"
          etiqueta="Desde"
          valor={periodo.desde}
          alCambiar={(desde) => {
            setPeriodo((p) => ({ ...p, desde }));
          }}
        />
        <CampoFecha
          id="reporte-hasta"
          etiqueta="Hasta"
          valor={periodo.hasta}
          alCambiar={(hasta) => {
            setPeriodo((p) => ({ ...p, hasta }));
          }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <input
            id="reporte-comparar"
            type="checkbox"
            checked={compara}
            onChange={(e) => {
              setCompara(e.target.checked);
            }}
          />
          <Label htmlFor="reporte-comparar">Comparar con otro período</Label>
        </div>
        {compara && (
          <>
            <CampoFecha
              id="reporte-comparar-desde"
              etiqueta="Comparar desde"
              valor={comparado.desde}
              alCambiar={(desde) => {
                setComparado((c) => ({ ...c, desde }));
              }}
            />
            <CampoFecha
              id="reporte-comparar-hasta"
              etiqueta="Comparar hasta"
              valor={comparado.hasta}
              alCambiar={(hasta) => {
                setComparado((c) => ({ ...c, hasta }));
              }}
            />
          </>
        )}
        <div className="ml-auto flex gap-2">
          {(["xlsx", "pdf"] as const).map((formato) => (
            <Button
              key={formato}
              type="button"
              variant="outline"
              disabled={!data}
              onClick={() => void descargar(formato)}
            >
              <Download aria-hidden="true" />
              {formato === "xlsx" ? "Descargar Excel" : "Descargar PDF"}
            </Button>
          ))}
        </div>
      </div>

      {catalogo.isError && <p role="alert">{mensajeDeError(catalogo.error)}</p>}
      {errorDescarga && <p role="alert">{errorDescarga}</p>}
      {!catalogo.isError && reporte.isPending && <p role="status">Cargando el reporte…</p>}
      {reporte.isError && <p role="alert">{mensajeDeError(reporte.error)}</p>}

      {data && !reporte.isError && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Período: del {formatearFecha(data.desde)} al {formatearFecha(data.hasta)}
          </p>
          {data.filas.length > 0 ? (
            <TablaReporte
              nombre={`Período principal — ${data.nombre}`}
              columnas={data.columnas}
              filas={data.filas}
            />
          ) : (
            <p role="status">No hay datos para el período.</p>
          )}

          {comparando && data.filas_comparadas === null && (
            <p role="status">Este reporte no admite comparación.</p>
          )}
          {comparando && data.filas_comparadas && data.comparar_desde && data.comparar_hasta && (
            <>
              <p className="text-sm text-muted-foreground">
                Comparado con el período del {formatearFecha(data.comparar_desde)} al{" "}
                {formatearFecha(data.comparar_hasta)}
              </p>
              {data.filas_comparadas.length > 0 ? (
                <TablaReporte
                  nombre={`Período comparado — ${data.nombre}`}
                  columnas={data.columnas}
                  filas={data.filas_comparadas}
                />
              ) : (
                <p role="status">No hay datos en el período comparado.</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
