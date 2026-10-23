import type { Destino } from "@rumbo/shared";
import { useDarDeBajaDestino, useDestinos, useReactivarDestino } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormularioDestino } from "./FormularioDestino";
import { RequisitosDestino } from "./RequisitosDestino";

/** Destinos y sus requisitos (CU-15, RF-089, RF-090, RF-086), pantalla 51 del prototipo. */
export function PestanaDestinos({ cliente }: { cliente: AxiosInstance }) {
  const [inactivos, setInactivos] = useState(false);
  const { data, isError } = useDestinos(cliente, { activo: !inactivos, por_pagina: 100 });
  const darDeBaja = useDarDeBajaDestino(cliente);
  const reactivar = useReactivarDestino(cliente);
  // `null` = formulario cerrado, `"nuevo"` = alta, un destino = edición.
  const [formulario, setFormulario] = useState<Destino | "nuevo" | null>(null);
  const [conRequisitos, setConRequisitos] = useState<Destino | null>(null);

  function abrirFormulario(valor: Destino | "nuevo") {
    setConRequisitos(null);
    setFormulario(valor);
  }

  function abrirRequisitos(destino: Destino) {
    setFormulario(null);
    setConRequisitos(destino);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Destinos</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={inactivos}
              onChange={(evento) => {
                setInactivos(evento.target.checked);
              }}
            />
            Ver inactivos
          </label>
          <Button
            onClick={() => {
              abrirFormulario("nuevo");
            }}
          >
            Nuevo destino
          </Button>
        </div>
      </div>
      {formulario && (
        <FormularioDestino
          key={formulario === "nuevo" ? "nuevo" : formulario.id}
          cliente={cliente}
          destino={formulario === "nuevo" ? undefined : formulario}
          onCerrar={() => {
            setFormulario(null);
          }}
        />
      )}
      {isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar los destinos. Probá de nuevo en unos minutos.
        </p>
      ) : (
        data &&
        (data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay destinos para mostrar.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Destino</th>
                <th className="py-2 font-medium">País</th>
                <th className="py-2 font-medium">Región</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((destino) => (
                <tr key={destino.id} className="border-b">
                  <td className="py-2">{destino.nombre}</td>
                  <td className="py-2">{destino.pais}</td>
                  <td className="py-2">{destino.region}</td>
                  <td className="flex justify-end gap-2 py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        abrirRequisitos(destino);
                      }}
                    >
                      Requisitos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        abrirFormulario(destino);
                      }}
                    >
                      Editar
                    </Button>
                    {destino.activo ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={darDeBaja.isPending}
                        onClick={() => {
                          darDeBaja.mutate(destino.id);
                        }}
                      >
                        Dar de baja
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reactivar.isPending}
                        onClick={() => {
                          reactivar.mutate(destino.id);
                        }}
                      >
                        Reactivar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))
      )}
      {conRequisitos && <RequisitosDestino cliente={cliente} destino={conRequisitos} />}
    </div>
  );
}
