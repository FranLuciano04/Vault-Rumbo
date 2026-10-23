import type { Cliente } from "@rumbo/shared";
import { Link, useNavigate } from "react-router";

const ENCABEZADOS = ["Cliente", "Segmento", "Etiquetas", "Asesor", "Último viaje", "Oportunidades"];

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Tabla del listado (pantalla 8). Asesor, último viaje y oportunidades no vienen en el contrato: se muestra «—». */
export function TablaClientes({ clientes }: { clientes: Cliente[] }) {
  const navegar = useNavigate();
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b text-muted-foreground">
        <tr>
          {ENCABEZADOS.map((titulo) => (
            <th key={titulo} scope="col" className="px-3 py-2 font-medium">
              {titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr
            key={c.id}
            className="cursor-pointer border-b hover:bg-accent"
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest("a")) void navegar(`/clientes/${c.id}`);
            }}
          >
            <td className="px-3 py-3">
              <Link to={`/clientes/${c.id}`} className="font-medium hover:underline">
                {c.nombre}
              </Link>
              <p className="text-muted-foreground">{c.contacto}</p>
            </td>
            <td className="px-3 py-3">
              <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
                {capitalizar(c.segmento)}
              </span>
            </td>
            <td className="px-3 py-3">
              <ul className="flex flex-wrap gap-1">
                {c.etiquetas.map((etiqueta) => (
                  <li key={etiqueta} className="rounded-md border px-2 py-0.5">
                    {etiqueta}
                  </li>
                ))}
              </ul>
            </td>
            <td className="px-3 py-3 text-muted-foreground">—</td>
            <td className="px-3 py-3 text-muted-foreground">—</td>
            <td className="px-3 py-3 text-muted-foreground">—</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
