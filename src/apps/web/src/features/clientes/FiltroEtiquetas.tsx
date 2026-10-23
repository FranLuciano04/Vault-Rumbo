import { useEtiquetasClientes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Filtro de etiquetas (RF-031, pantalla 8): el botón abre un menú con las etiquetas en uso y las
 * elegidas quedan como chips removibles. El cliente tiene que tener todas.
 */
export function FiltroEtiquetas({
  cliente,
  elegidas,
  alCambiar,
}: {
  cliente: AxiosInstance;
  elegidas: string[];
  alCambiar: (etiquetas: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const { data: disponibles = [] } = useEtiquetasClientes(cliente);

  const alternar = (etiqueta: string) => {
    alCambiar(
      elegidas.includes(etiqueta)
        ? elegidas.filter((e) => e !== etiqueta)
        : [...elegidas, etiqueta],
    );
  };

  return (
    <div className="relative ml-auto flex flex-wrap items-center gap-2">
      {elegidas.map((etiqueta) => (
        <Button
          key={etiqueta}
          size="sm"
          variant="default"
          className="rounded-full"
          aria-label={`Quitar ${etiqueta}`}
          onClick={() => {
            alternar(etiqueta);
          }}
        >
          {etiqueta}
          <X aria-hidden="true" />
        </Button>
      ))}
      <Button
        variant={elegidas.length > 0 ? "default" : "outline"}
        aria-expanded={abierto}
        onClick={() => {
          setAbierto(!abierto);
        }}
      >
        <SlidersHorizontal aria-hidden="true" />
        Etiquetas
      </Button>
      {abierto && (
        <div
          role="group"
          aria-label="Etiquetas en uso"
          className="absolute top-full right-0 z-10 mt-2 flex max-h-72 w-64 flex-col gap-1 overflow-y-auto rounded-xl border bg-card p-2 shadow-md"
        >
          {disponibles.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">No hay etiquetas en uso.</p>
          )}
          {disponibles.map((etiqueta) => (
            <label
              key={etiqueta}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={elegidas.includes(etiqueta)}
                onChange={() => {
                  alternar(etiqueta);
                }}
              />
              {etiqueta}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
