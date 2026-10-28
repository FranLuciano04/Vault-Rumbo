import type { Cliente } from "@rumbo/shared";
import { useDebouncedValue } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AltaRapidaCliente } from "./AltaRapidaCliente";
import { ResultadosClientes } from "./ResultadosClientes";

export interface ClienteElegido {
  id: string;
  nombre: string;
}

/** Elige un cliente (CU-04 paso 2, CU-17): busca en el servidor o lo da de alta en el momento (A1). */
export function BuscadorCliente({
  cliente,
  elegido,
  error,
  requerido = false,
  alElegir,
}: {
  cliente: AxiosInstance;
  elegido: ClienteElegido | null;
  error?: string;
  requerido?: boolean;
  alElegir: (elegido: ClienteElegido | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [conAlta, setConAlta] = useState(false);
  const buscar = useDebouncedValue(texto.trim());

  const elegirNuevo = (nuevo: Cliente) => {
    alElegir({ id: nuevo.id, nombre: nuevo.nombre });
    setConAlta(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {elegido ? (
        <>
          <span className="text-sm font-medium">Cliente</span>
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
            <span className="font-medium">{elegido.nombre}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTexto("");
                alElegir(null);
              }}
            >
              Cambiar cliente
            </Button>
          </div>
        </>
      ) : (
        <>
          <Label htmlFor="buscar-cliente">Buscar cliente</Label>
          <Input
            id="buscar-cliente"
            type="search"
            placeholder="Nombre o contacto"
            required={requerido}
            aria-invalid={Boolean(error)}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
            }}
          />
          {buscar && <ResultadosClientes cliente={cliente} buscar={buscar} alElegir={alElegir} />}
          {!conAlta && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setConAlta(true);
                }}
              >
                Crear cliente nuevo
              </Button>
            </div>
          )}
          {conAlta && (
            <AltaRapidaCliente
              cliente={cliente}
              alCrear={elegirNuevo}
              alCancelar={() => {
                setConAlta(false);
              }}
            />
          )}
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
