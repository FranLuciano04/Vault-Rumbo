import type { UsuarioActual } from "@rumbo/shared";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  FileChartColumn,
  FileText,
  Funnel,
  Hotel,
  type LucideIcon,
  Send,
  Settings,
  Share2,
  User,
} from "lucide-react";

export interface Seccion {
  id: string;
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
}

type Visibilidad = "todos" | "redes" | "admin";

/** Secciones del menú en orden; la visibilidad sigue la tabla «Vistas por rol» del prototipo. */
const SECCIONES: { id: string; etiqueta: string; icono: LucideIcon; visible: Visibilidad }[] = [
  { id: "agenda", etiqueta: "Agenda", icono: Bell, visible: "todos" },
  { id: "calendario", etiqueta: "Calendario", icono: CalendarDays, visible: "todos" },
  { id: "clientes", etiqueta: "Clientes", icono: User, visible: "todos" },
  { id: "oportunidades", etiqueta: "Oportunidades", icono: Funnel, visible: "todos" },
  { id: "cotizaciones", etiqueta: "Cotizaciones", icono: FileText, visible: "todos" },
  { id: "viajes", etiqueta: "Viajes", icono: Send, visible: "todos" },
  { id: "hoteles", etiqueta: "Hoteles", icono: Hotel, visible: "todos" },
  { id: "redes", etiqueta: "Redes", icono: Share2, visible: "redes" },
  { id: "dashboard", etiqueta: "Dashboard", icono: ChartColumn, visible: "todos" },
  { id: "reportes", etiqueta: "Reportes", icono: FileChartColumn, visible: "admin" },
  { id: "configuracion", etiqueta: "Configuración", icono: Settings, visible: "admin" },
];

/** La API decide el acceso real (RF-141); esto solo oculta lo que el rol no puede usar. */
export function seccionesVisibles(usuario: UsuarioActual): Seccion[] {
  const esAdmin = usuario.rol === "admin" || usuario.rol === "dueno";
  return SECCIONES.filter(({ visible }) => {
    if (visible === "admin") return esAdmin;
    if (visible === "redes") return usuario.rol !== "freelance" && usuario.acceso_redes;
    return true;
  }).map(({ id, etiqueta, icono }) => ({ id, etiqueta, icono, ruta: `/${id}` }));
}
