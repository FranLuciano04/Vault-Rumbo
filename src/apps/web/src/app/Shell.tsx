import type { UsuarioActual } from "@rumbo/shared";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { BotonCerrarSesion } from "@/features/seguridad/BotonCerrarSesion";
import { cn } from "@/lib/utils";
import { seccionesVisibles } from "./navegacion";

const ETIQUETA_ROL: Record<UsuarioActual["rol"], string> = {
  empleado: "Empleado",
  admin: "Admin",
  dueno: "Dueño",
  freelance: "Freelance",
};

/** Layout del prototipo: barra lateral con las secciones del rol, encabezado con la sesión y contenido. */
export function Shell({ usuario, children }: { usuario: UsuarioActual; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4">
        <span className="px-3 text-xl font-bold text-sidebar-primary">Rumbo</span>
        <nav aria-label="Navegación principal" className="flex flex-col gap-1">
          {seccionesVisibles(usuario).map(({ id, etiqueta, ruta, icono: Icono }) => (
            <NavLink
              key={id}
              to={ruta}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent",
                  isActive &&
                    "bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary",
                )
              }
            >
              <Icono aria-hidden="true" className="size-4 shrink-0" />
              {etiqueta}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-border px-6 py-3">
          <span className="text-sm font-semibold">{usuario.nombre}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {ETIQUETA_ROL[usuario.rol]}
          </span>
          <BotonCerrarSesion />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
