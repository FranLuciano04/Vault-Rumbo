import { formatearFecha, hoyEnBuenosAires } from "@rumbo/shared";
import { descargarReporte, useReporte, useReportes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarArchivo } from "@/lib/descargas";
import { mensajeDeErrorCon } from "@/lib/errores";
import { TablaReporte } from "./TablaReporte";

const TIPO_ARCHIVO = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

const ERROR_AL_CARGAR = "No pudimos cargar el reporte. Probá de nuevo en unos minutos.";
const ERROR_AL_DESCARGAR = "No pudimos descargar el reporte. Probá de nuevo en unos minutos.";
/** Su período por defecto lo define el backend (últimos 12 meses): hasta que se toquen las fechas no se mandan. */
const REPORTE_CON_PERIODO_PROPIO = "comparacion-mensual";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Primer y último día del mes en curso en Buenos Aires, como `YYYY-MM-DD`. */
function mesEnCurso() {
  const prefijo = hoyEnBuenosAires().slice(0, 7);
  const ultimo = new Date(Number(prefijo.slice(0, 4)), Number(prefijo.slice(5)), 0).getDate();
  return { desde: `${prefijo}-01`, hasta: `${prefijo}-${dosDigitos(ultimo)}` };
}

type Periodo = { desde: string; hasta: string };

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
export function PaginaReportes({ cliente }: { cliente: AxiosInstance }) {
  const [elegido, setElegido] = useState("");
  // Lo que muestran los inputs (puede estar a medio tipear) y el último período completo que se consulta.
  const [escritas, setEscritas] = useState<Periodo | null>(null);
  const [consulta, setConsulta] = useState<Periodo | null>(null);
  const [compara, setCompara] = useState(false);
  const [comparado, setComparado] = useState({ desde: "", hasta: "" });
  const [descargando, setDescargando] = useState(false);
  const [falloDescarga, setFalloDescarga] = useState<{ clave: string; mensaje: string } | null>(
    null,
  );

  const catalogo = useReportes(cliente);
  const reporteId = elegido || catalogo.data?.[0]?.id || "";
  const porDefecto = reporteId === REPORTE_CON_PERIODO_PROPIO ? null : mesEnCurso();
  const periodo = consulta ?? porDefecto;
  const comparando = compara && comparado.desde !== "" && comparado.hasta !== "";
  const filtros = {
    ...periodo,
    ...(comparando && { comparar_desde: comparado.desde, comparar_hasta: comparado.hasta }),
  };
  const reporte = useReporte(cliente, reporteId, filtros);
  const { data } = reporte;

  const mostradas = escritas ??
    porDefecto ?? { desde: data?.desde ?? "", hasta: data?.hasta ?? "" };
  const periodoCompleto = mostradas.desde !== "" && mostradas.hasta !== "";
  const claveFiltros = JSON.stringify([reporteId, filtros]);

  function cambiarFecha(campo: keyof Periodo, valor: string) {
    const siguiente = { ...mostradas, [campo]: valor };
    setEscritas(siguiente);
    // Con una fecha vacía o a medio tipear no se consulta: se sigue mostrando el último período completo.
    if (siguiente.desde && siguiente.hasta) setConsulta(siguiente);
  }

  async function descargar(formato: keyof typeof TIPO_ARCHIVO) {
    if (!data) return;
    setFalloDescarga(null);
    setDescargando(true);
    try {
      const sinGuiones = (fecha: string) => fecha.replaceAll("-", "");
      guardarArchivo(
        await descargarReporte(cliente, reporteId, formato, filtros),
        `${reporteId}-${sinGuiones(data.desde)}-${sinGuiones(data.hasta)}.${formato}`,
        TIPO_ARCHIVO[formato],
      );
    } catch (falla) {
      setFalloDescarga({
        clave: claveFiltros,
        mensaje: mensajeDeErrorCon(falla, ERROR_AL_DESCARGAR),
      });
    } finally {
      setDescargando(false);
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
          valor={mostradas.desde}
          alCambiar={(desde) => {
            cambiarFecha("desde", desde);
          }}
        />
        <CampoFecha
          id="reporte-hasta"
          etiqueta="Hasta"
          valor={mostradas.hasta}
          alCambiar={(hasta) => {
            cambiarFecha("hasta", hasta);
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
              disabled={!data || reporte.isPlaceholderData || descargando || !periodoCompleto}
              onClick={() => void descargar(formato)}
            >
              <Download aria-hidden="true" />
              {formato === "xlsx" ? "Descargar Excel" : "Descargar PDF"}
            </Button>
          ))}
        </div>
      </div>

      {catalogo.isError && <p role="alert">{mensajeDeErrorCon(catalogo.error, ERROR_AL_CARGAR)}</p>}
      {falloDescarga?.clave === claveFiltros && <p role="alert">{falloDescarga.mensaje}</p>}
      {!catalogo.isError && reporte.isPending && <p role="status">Cargando el reporte…</p>}
      {reporte.isError && <p role="alert">{mensajeDeErrorCon(reporte.error, ERROR_AL_CARGAR)}</p>}

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
