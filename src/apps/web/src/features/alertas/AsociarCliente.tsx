import { useClientes, useDebouncedValue } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { CLASE_SELECT } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AsociadoRecordatorio } from "./FormularioRecordatorio";

/** Clientes que coinciden con la búsqueda, para elegir uno (también lo usa el alta de consulta). */
export function ResultadosClientes({
  cliente,
  buscar,
  alElegir,
}: {
  cliente: AxiosInstance;
  buscar: string;
  alElegir: (asociado: AsociadoRecordatorio) => void;
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
              alElegir({ tipo: "cliente", id, etiqueta: nombre });
            }}
          >
            {nombre} · {contacto}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Asociación opcional del recordatorio a un cliente (CU-28 paso 3). Viaje y oportunidad se suman
 * cuando tengan pantalla.
 */
export function AsociarCliente({
  cliente,
  conCliente,
  elegido,
  alCambiarModo,
  alElegir,
}: {
  cliente: AxiosInstance;
  conCliente: boolean;
  elegido: AsociadoRecordatorio | null;
  alCambiarModo: (conCliente: boolean) => void;
  alElegir: (asociado: AsociadoRecordatorio | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const buscar = useDebouncedValue(texto.trim());
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="asociar-a">Asociar a</Label>
      <select
        id="asociar-a"
        className={CLASE_SELECT}
        value={conCliente ? "cliente" : "personal"}
        onChange={(e) => {
          alCambiarModo(e.target.value === "cliente");
          alElegir(null);
        }}
      >
        <option value="personal">Personal (sin asociar)</option>
        <option value="cliente">Cliente</option>
      </select>
      {conCliente && elegido && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              alElegir(null);
            }}
          >
            Cambiar cliente
          </Button>
        </div>
      )}
      {conCliente && !elegido && (
        <>
          <Label htmlFor="buscar-cliente">Buscar cliente</Label>
          <Input
            id="buscar-cliente"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
            }}
          />
          {buscar && <ResultadosClientes cliente={cliente} buscar={buscar} alElegir={alElegir} />}
        </>
      )}
    </div>
  );
}
