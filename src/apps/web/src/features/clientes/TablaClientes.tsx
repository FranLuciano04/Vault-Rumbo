import type { Cliente, UsuarioActual } from "@rumbo/shared";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ETIQUETA_SEGMENTO } from "./segmentos";

const ENCABEZADOS = ["Cliente", "Segmento", "Etiquetas", "Asesor", "Último viaje", "Oportunidades"];

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");

/**
 * Tabla del listado (pantalla 8). El contrato no trae el nombre del asesor, el último viaje ni las
 * oportunidades: el asesor se resuelve solo si es el usuario de la sesión; el resto muestra «—».
 */
export function TablaClientes({
  clientes,
  usuario,
}: {
  clientes: Cliente[];
  usuario: UsuarioActual;
}) {
  const navegar = useNavigate();
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="bg-muted text-muted-foreground">
          {ENCABEZADOS.map((titulo) => (
            <th key={titulo} scope="col" className="px-3 py-2 font-medium first:rounded-l-lg">
              {titulo}
            </th>
          ))}
          <th className="w-8 rounded-r-lg" aria-hidden="true" />
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr
            key={c.id}
            className="cursor-pointer border-b last:border-b-0 hover:bg-accent"
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest("a")) void navegar(`/clientes/${c.id}`);
            }}
          >
            <td className="px-3 py-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2 text-xs font-medium text-primary-foreground"
                >
                  {iniciales(c.nombre)}
                </span>
                <div>
                  <Link to={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.nombre}
                  </Link>
                  <p className="text-muted-foreground">{c.contacto}</p>
                </div>
              </div>
            </td>
            <td className="px-3 py-3">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {ETIQUETA_SEGMENTO[c.segmento]}
              </span>
            </td>
            <td className="px-3 py-3">
              <ul className="flex flex-wrap gap-1">
                {c.etiquetas.map((etiqueta) => (
                  <li key={etiqueta} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {etiqueta}
                  </li>
                ))}
              </ul>
            </td>
            <td className="px-3 py-3">
              {c.asesor_asignado_id === usuario.id ? (
                usuario.nombre
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-3 py-3 text-muted-foreground">—</td>
            <td className="px-3 py-3 text-muted-foreground">—</td>
            <td className="px-3 py-3">
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
