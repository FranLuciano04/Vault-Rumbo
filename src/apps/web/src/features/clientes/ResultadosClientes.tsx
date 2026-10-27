import { useClientes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Button } from "@/components/ui/button";

/** Clientes que coinciden con la búsqueda, para elegir uno. */
export function ResultadosClientes({
  cliente,
  buscar,
  alElegir,
}: {
  cliente: AxiosInstance;
  buscar: string;
  alElegir: (elegido: { id: string; nombre: string }) => void;
}) {
  const { data, isPending, isError } = useClientes(cliente, { buscar, por_pagina: 5 });
  if (isPending) return <p role="status">Buscando clientes…</p>;
  if (isError) return <p role="alert">No pudimos buscar clientes. Probá de nuevo.</p>;
  if (data.items.length === 0) return <p role="status">No encontramos clientes.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {data.items.map(({ id, nombre, contacto }) => (
        <li key={id}>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              alElegir({ id, nombre });
            }}
          >
            {nombre} · {contacto}
          </Button>
        </li>
      ))}
    </ul>
  );
}
