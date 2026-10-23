import type { AxiosInstance } from "axios";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PestanaDestinos } from "./destinos/PestanaDestinos";
import { PestanaUsuarios } from "./usuarios/PestanaUsuarios";
import { FormularioComision } from "./FormularioComision";
import { FormularioParametros } from "./FormularioParametros";

const PESTANAS = [
  { id: "parametros", etiqueta: "Parámetros y comisiones", habilitada: true },
  { id: "usuarios", etiqueta: "Usuarios y roles", habilitada: true },
  { id: "destinos", etiqueta: "Destinos y requisitos", habilitada: true },
  { id: "operadores", etiqueta: "Operadores", habilitada: false },
];

/**
 * Configuración (CU-13, CU-15 y CU-25, pantallas 30, 31 y 51 del prototipo). Por ahora están
 * activas las pestañas de parámetros y comisiones, usuarios y destinos; la otra llega con su ticket.
 */
export function PaginaConfiguracion({ cliente }: { cliente: AxiosInstance }) {
  const [pestana, setPestana] = useState("parametros");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <div role="tablist" aria-label="Secciones de Configuración" className="flex gap-1 border-b">
        {PESTANAS.map(({ id, etiqueta, habilitada }) => {
          const activa = id === pestana;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`pestana-${id}`}
              aria-selected={activa}
              aria-controls={activa ? `panel-${id}` : undefined}
              disabled={!habilitada}
              onClick={() => {
                setPestana(id);
              }}
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
        id={`panel-${pestana}`}
        aria-labelledby={`pestana-${pestana}`}
        className="flex flex-col gap-10"
      >
        {pestana === "parametros" && (
          <>
            <FormularioParametros cliente={cliente} />
            <FormularioComision cliente={cliente} />
          </>
        )}
        {pestana === "usuarios" && <PestanaUsuarios cliente={cliente} />}
        {pestana === "destinos" && <PestanaDestinos cliente={cliente} />}
      </div>
    </div>
  );
}
