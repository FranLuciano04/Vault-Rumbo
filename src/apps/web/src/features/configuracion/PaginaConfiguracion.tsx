import type { AxiosInstance } from "axios";
import { cn } from "@/lib/utils";
import { FormularioComision } from "./FormularioComision";
import { FormularioParametros } from "./FormularioParametros";

const PESTANAS = [
  { id: "parametros", etiqueta: "Parámetros y comisiones" },
  { id: "usuarios", etiqueta: "Usuarios y roles" },
  { id: "destinos", etiqueta: "Destinos y requisitos" },
  { id: "operadores", etiqueta: "Operadores" },
];

/**
 * Configuración (CU-13, pantallas 30 y 51 del prototipo). Por ahora solo está activa la pestaña de
 * parámetros y comisiones; las otras tres llegan con sus propios tickets.
 */
export function PaginaConfiguracion({ cliente }: { cliente: AxiosInstance }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <div role="tablist" aria-label="Secciones de Configuración" className="flex gap-1 border-b">
        {PESTANAS.map(({ id, etiqueta }) => {
          const activa = id === "parametros";
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`pestana-${id}`}
              aria-selected={activa}
              aria-controls={activa ? "panel-parametros" : undefined}
              disabled={!activa}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium disabled:opacity-50",
                activa
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="panel-parametros"
        aria-labelledby="pestana-parametros"
        className="flex flex-col gap-10"
      >
        <FormularioParametros cliente={cliente} />
        <FormularioComision cliente={cliente} />
      </div>
    </div>
  );
}
