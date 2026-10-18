import type { UsuarioActual } from "@rumbo/shared";

export interface Seccion {
  id: string;
  etiqueta: string;
  ruta: string;
}

type Visibilidad = "todos" | "redes" | "admin";

/** Secciones del menú en orden; la visibilidad sigue la tabla «Vistas por rol» del prototipo. */
const SECCIONES: { id: string; etiqueta: string; visible: Visibilidad }[] = [
  { id: "agenda", etiqueta: "Agenda", visible: "todos" },
  { id: "calendario", etiqueta: "Calendario", visible: "todos" },
  { id: "clientes", etiqueta: "Clientes", visible: "todos" },
  { id: "oportunidades", etiqueta: "Oportunidades", visible: "todos" },
  { id: "cotizaciones", etiqueta: "Cotizaciones", visible: "todos" },
  { id: "viajes", etiqueta: "Viajes", visible: "todos" },
  { id: "hoteles", etiqueta: "Hoteles", visible: "todos" },
  { id: "redes", etiqueta: "Redes", visible: "redes" },
  { id: "dashboard", etiqueta: "Dashboard", visible: "todos" },
  { id: "reportes", etiqueta: "Reportes", visible: "admin" },
  { id: "configuracion", etiqueta: "Configuración", visible: "admin" },
];

/** La API decide el acceso real (RF-141); esto solo oculta lo que el rol no puede usar. */
export function seccionesVisibles(usuario: UsuarioActual): Seccion[] {
  const esAdmin = usuario.rol === "admin" || usuario.rol === "dueno";
  return SECCIONES.filter(({ visible }) => {
    if (visible === "admin") return esAdmin;
    if (visible === "redes") return usuario.rol !== "freelance" && usuario.acceso_redes;
    return true;
  }).map(({ id, etiqueta }) => ({ id, etiqueta, ruta: `/${id}` }));
}
