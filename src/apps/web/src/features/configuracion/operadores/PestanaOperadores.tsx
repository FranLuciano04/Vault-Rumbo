import type { Operador } from "@rumbo/shared";
import { useDarDeBajaOperador, useOperadores, useReactivarOperador } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "../errores";
import { FormularioOperador } from "./FormularioOperador";

/** Operadores (CU-31, RF-093 a RF-096), pantalla 33 del prototipo. */
export function PestanaOperadores({ cliente }: { cliente: AxiosInstance }) {
  const [inactivos, setInactivos] = useState(false);
  const { data, isError } = useOperadores(cliente, { activo: !inactivos, por_pagina: 100 });
  const darDeBaja = useDarDeBajaOperador(cliente);
  const reactivar = useReactivarOperador(cliente);
  // `null` = formulario cerrado, `"nuevo"` = alta, un operador = edición.
  const [formulario, setFormulario] = useState<Operador | "nuevo" | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<Operador | null>(null);

  function confirmarBaja(operador: Operador) {
    setPorDarDeBaja(null);
    darDeBaja.mutate(operador.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Operadores</h2>
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
              setFormulario("nuevo");
            }}
          >
            Nuevo operador
          </Button>
        </div>
      </div>
      {formulario && (
        <FormularioOperador
          key={formulario === "nuevo" ? "nuevo" : formulario.id}
          cliente={cliente}
          operador={formulario === "nuevo" ? undefined : formulario}
          onCerrar={() => {
            setFormulario(null);
          }}
        />
      )}
      {porDarDeBaja && (
        <div
          role="alertdialog"
          aria-label={`Dar de baja a ${porDarDeBaja.nombre}`}
          className="flex max-w-md flex-col gap-3 rounded-md border p-4 text-sm"
        >
          <p>
            ¿Dar de baja a {porDarDeBaja.nombre}? Queda inactivo y se conserva su historial. Podés
            reactivarlo cuando quieras.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                confirmarBaja(porDarDeBaja);
              }}
            >
              Confirmar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPorDarDeBaja(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {(darDeBaja.isError || reactivar.isError) && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensajeDeError(darDeBaja.error ?? reactivar.error)}
        </p>
      )}
      {isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar los operadores. Probá de nuevo en unos minutos.
        </p>
      ) : (
        data &&
        (data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay operadores para mostrar.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">Operador</th>
                  <th className="py-2 font-medium">Contacto</th>
                  <th className="py-2 font-medium">Estado</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((operador) => (
                  <tr key={operador.id} className="border-b">
                    <td className="py-2">{operador.nombre}</td>
                    <td className="py-2">{operador.contacto}</td>
                    <td className="py-2">{operador.activo ? "Activo" : "Inactivo"}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormulario(operador);
                          }}
                        >
                          Editar
                        </Button>
                        {operador.activo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={darDeBaja.isPending}
                            onClick={() => {
                              setPorDarDeBaja(operador);
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
                              reactivar.mutate(operador.id);
                            }}
                          >
                            Reactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.total > data.items.length && (
              <p role="status" className="text-sm text-muted-foreground">
                Mostramos {data.items.length} de {data.total} operadores.
              </p>
            )}
          </>
        ))
      )}
    </div>
  );
}
