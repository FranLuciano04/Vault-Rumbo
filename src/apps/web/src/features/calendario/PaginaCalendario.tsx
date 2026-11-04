import { formatearFecha, hoyEnBuenosAires, type EventoCalendario } from "@rumbo/shared";
import { useCalendario } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { mensajeDeErrorCon } from "@/lib/errores";
import { diasDelPeriodo, huecoInicial, moverAncla, type VistaCalendario } from "./periodo";

const VISTAS: { id: VistaCalendario; nombre: string }[] = [
  { id: "mes", nombre: "Mes" },
  { id: "semana", nombre: "Semana" },
  { id: "dia", nombre: "Día" },
];

const TIPOS: { id: EventoCalendario["tipo"]; nombre: string }[] = [
  { id: "viaje", nombre: "Viajes" },
  { id: "vencimiento", nombre: "Vencimientos" },
  { id: "alerta", nombre: "Alertas" },
];

const ESTADOS: Record<EventoCalendario["estado"], string> = {
  reservado: "Reservado",
  vendido: "Vendido",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  pendiente: "Pendiente",
  pagado: "Pagado",
  vencido: "Vencido",
  anulado: "Anulado",
  vista: "Vista",
  resuelta: "Resuelta",
};

/** El contrato excluye los pagos anulados del calendario: no se ofrece filtrarlos. */
const ESTADOS_FILTRABLES = Object.entries(ESTADOS).filter(([id]) => id !== "anulado");

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Color del chip según tipo y estado: un vencimiento va ámbar, rojo si venció y verde si se pagó. */
function claseChip({ tipo, estado }: EventoCalendario) {
  if (tipo === "alerta") return "bg-muted text-muted-foreground";
  if (tipo === "viaje")
    return estado === "cancelado"
      ? "bg-muted text-muted-foreground line-through"
      : "bg-secondary text-secondary-foreground";
  if (estado === "vencido") return "bg-red-50 text-red-700";
  if (estado === "pagado") return "bg-green-50 text-green-800";
  return "bg-amber-50 text-amber-900";
}

const CLASE_SELECT = "h-9 min-w-44 rounded-md border border-input bg-background px-3 text-sm";

/** Celdas en blanco de la grilla (solo en pantallas anchas), antes del día 1 o después del último. */
const celdasVacias = (lado: "antes" | "despues", cantidad: number) =>
  Array.from({ length: cantidad }, (_, i) => (
    <li
      key={`${lado}-${String(i)}`}
      aria-hidden="true"
      className="hidden min-h-24 bg-muted/40 sm:block"
    />
  ));

/** Dónde se gestiona el evento: el viaje (también para un pago) o la agenda para una alerta. */
const rutaDe = (e: EventoCalendario) =>
  e.tipo === "alerta" ? "/agenda" : `/viajes/${e.viaje_id ?? ""}`;

function titularPeriodo(vista: VistaCalendario, dias: string[]) {
  const primero = dias[0] ?? "";
  if (vista === "semana")
    return `${formatearFecha(primero)} al ${formatearFecha(dias.at(-1) ?? primero)}`;
  const fecha = new Date(`${primero}T12:00:00`);
  const texto =
    vista === "mes"
      ? `${fecha.toLocaleDateString("es-AR", { month: "long" })} ${primero.slice(0, 4)}`
      : fecha.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Calendario de viajes, vencimientos y alertas (CU-23, pantallas 20 y 38). Solo lectura. */
export function PaginaCalendario({ cliente }: { cliente: AxiosInstance }) {
  const hoy = hoyEnBuenosAires();
  const [vista, setVista] = useState<VistaCalendario>("mes");
  const [ancla, setAncla] = useState(hoy);
  const [tipo, setTipo] = useState<EventoCalendario["tipo"] | "">("");
  const [estado, setEstado] = useState("");

  const dias = diasDelPeriodo(vista, ancla);
  const desde = dias[0] ?? ancla;
  const hasta = dias.at(-1) ?? ancla;
  const { data, isPending, isPlaceholderData, isError, error } = useCalendario(cliente, {
    desde,
    hasta,
    tipo: tipo || undefined,
  });

  // El estado se filtra acá (DEC-0024 punto 9). El rango y el tipo también: mientras llega el
  // pedido nuevo la query conserva los eventos del anterior (`isPlaceholderData`).
  const visibles = (data ?? []).filter(
    (e) =>
      (!estado || e.estado === estado) &&
      (!tipo || e.tipo === tipo) &&
      e.hasta >= desde &&
      e.desde <= hasta,
  );
  const delDia = (dia: string) => visibles.filter((e) => e.desde <= dia && dia <= e.hasta);
  const hueco = vista === "mes" ? huecoInicial(desde) : 0;

  const enGrilla = vista !== "dia";
  const relleno = enGrilla
    ? (DIAS_SEMANA.length - ((hueco + dias.length) % DIAS_SEMANA.length)) % DIAS_SEMANA.length
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Principal
          </p>
          <h1 className="text-3xl font-semibold">{titularPeriodo(vista, dias)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAncla(hoy);
            }}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAncla(moverAncla(vista, ancla, -1));
            }}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAncla(moverAncla(vista, ancla, 1));
            }}
          >
            Siguiente
          </Button>
          <div role="group" aria-label="Vista" className="ml-2 flex gap-1 rounded-lg bg-card p-1">
            {VISTAS.map(({ id, nombre }) => (
              <Button
                key={id}
                variant={vista === id ? "default" : "ghost"}
                aria-pressed={vista === id}
                onClick={() => {
                  setVista(id);
                }}
              >
                {nombre}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="calendario-tipo">Tipo</Label>
          <select
            id="calendario-tipo"
            className={CLASE_SELECT}
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as typeof tipo);
            }}
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map(({ id, nombre }) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="calendario-estado">Estado</Label>
          <select
            id="calendario-estado"
            className={CLASE_SELECT}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
            }}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_FILTRABLES.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isPending && <p role="status">Cargando el calendario…</p>}
      {isError && (
        <p role="alert">
          {mensajeDeErrorCon(
            error,
            "No pudimos cargar el calendario. Probá de nuevo en unos minutos.",
          )}
        </p>
      )}
      {!isPending && !isError && (
        <div
          aria-busy={isPlaceholderData}
          className={cn(
            "rounded-xl bg-card p-2 transition-opacity",
            isPlaceholderData && "opacity-60",
          )}
        >
          {enGrilla && (
            <ul className="hidden grid-cols-7 gap-px px-2 py-2 sm:grid">
              {DIAS_SEMANA.map((nombre) => (
                <li
                  key={nombre}
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {nombre}
                </li>
              ))}
            </ul>
          )}
          <ol
            className={`grid gap-px bg-border ${enGrilla ? "grid-cols-1 sm:grid-cols-7" : "grid-cols-1"}`}
          >
            {celdasVacias("antes", hueco)}
            {dias.map((dia) => (
              <li key={dia} className="flex min-h-24 flex-col gap-1 bg-card p-2">
                <span
                  className={`flex size-6 items-center justify-center text-xs font-medium ${dia === hoy ? "rounded-full bg-primary text-primary-foreground" : ""}`}
                >
                  {String(Number(dia.slice(8)))}
                </span>
                <ul className="flex flex-col gap-1">
                  {delDia(dia).map((e) => (
                    <li key={`${e.tipo}-${e.viaje_id ?? ""}-${e.pago_id ?? e.alerta_id ?? ""}`}>
                      <Link
                        to={rutaDe(e)}
                        className={`block truncate rounded-full px-2 py-1 text-xs font-medium hover:underline ${claseChip(e)}`}
                      >
                        {e.titulo}
                        <span className="sr-only"> ({ESTADOS[e.estado]})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {celdasVacias("despues", relleno)}
          </ol>
          {visibles.length === 0 && !isPlaceholderData && (
            <p role="status" className="py-8 text-center text-muted-foreground">
              No hay eventos en este período.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
