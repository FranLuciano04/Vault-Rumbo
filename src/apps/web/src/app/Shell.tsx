import type { UsuarioActual } from "@rumbo/shared";
import { Menu, X } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
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
  const idMenu = useId();
  const [abierto, setAbierto] = useState(false);
  const IconoMenu = abierto ? X : Menu;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-sidebar-border bg-sidebar p-4 md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between">
          <span className="px-3 text-xl font-bold text-sidebar-primary">Rumbo</span>
          <button
            type="button"
            aria-label="Menú"
            aria-expanded={abierto}
            aria-controls={idMenu}
            onClick={() => { setAbierto((v) => !v); }}
            className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
          >
            <IconoMenu aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div id={idMenu} className={cn("flex-col", abierto ? "flex" : "hidden md:flex")}>
          <nav aria-label="Navegación principal" className="flex flex-col gap-1">
            {seccionesVisibles(usuario).map(({ id, etiqueta, ruta, icono: Icono }) => (
              <NavLink
                key={id}
                to={ruta}
                onClick={() => { setAbierto(false); }}
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
        </div>
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
