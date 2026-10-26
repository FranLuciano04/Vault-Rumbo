import { type Alerta } from "@rumbo/shared";
import { usePosponerAlerta } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { diaSiguiente } from "./fechas";

export function FormularioPosponer({
  cliente,
  alerta,
  hoy,
  alCerrar,
}: {
  cliente: AxiosInstance;
  alerta: Alerta;
  hoy: string;
  alCerrar: () => void;
}) {
  const [fecha, setFecha] = useState("");
  const posponer = usePosponerAlerta(cliente);
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        posponer.mutate({ id: alerta.id, fecha }, { onSuccess: alCerrar });
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={`posponer-${alerta.id}`}>Nueva fecha</Label>
        <Input
          id={`posponer-${alerta.id}`}
          type="date"
          min={diaSiguiente(alerta.fecha > hoy ? alerta.fecha : hoy)}
          required
          className="h-9 w-44"
          value={fecha}
          onChange={(e) => {
            setFecha(e.target.value);
          }}
        />
      </div>
      <Button type="submit" size="sm" disabled={!fecha || posponer.isPending}>
        Confirmar
      </Button>
      <Button size="sm" variant="ghost" onClick={alCerrar}>
        Cancelar
      </Button>
      {posponer.isError && (
        <p role="alert" className="w-full text-sm text-destructive">
          {mensajeDeError(posponer.error)}
        </p>
      )}
    </form>
  );
}
