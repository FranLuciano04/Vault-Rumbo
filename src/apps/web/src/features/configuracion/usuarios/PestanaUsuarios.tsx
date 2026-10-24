import type { Usuario } from "@rumbo/shared";
import { useDarDeBajaUsuario, useUsuarios } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { ROLES } from "../esquemas";
import { FormularioUsuario } from "./FormularioUsuario";

const etiquetaDeRol = (rol: Usuario["rol"]) => ROLES.find(({ valor }) => valor === rol)?.etiqueta;

/** Admin y dueño acceden a redes siempre, por su rol (DEC-0013); el resto, según su permiso. */
const accesoARedes = ({ rol, acceso_redes }: Usuario) =>
  rol === "admin" || rol === "dueno" ? "Por su rol" : acceso_redes ? "Con acceso" : "Sin acceso";

/** Usuarios y roles (CU-25, RF-144 a RF-149), pantalla 31 del prototipo. */
export function PestanaUsuarios({ cliente }: { cliente: AxiosInstance }) {
  const { data, isError } = useUsuarios(cliente, { por_pagina: 100 });
  const darDeBaja = useDarDeBajaUsuario(cliente);
  // `null` = formulario cerrado, `"nuevo"` = alta, un usuario = edición.
  const [formulario, setFormulario] = useState<Usuario | "nuevo" | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<Usuario | null>(null);

  function confirmarBaja(usuario: Usuario) {
    setPorDarDeBaja(null);
    darDeBaja.mutate(usuario.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Usuarios y roles</h2>
        <Button
          onClick={() => {
            setFormulario("nuevo");
          }}
        >
          Nuevo usuario
        </Button>
      </div>
      {formulario && (
        <FormularioUsuario
          key={formulario === "nuevo" ? "nuevo" : formulario.id}
          cliente={cliente}
          usuario={formulario === "nuevo" ? undefined : formulario}
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
            ¿Dar de baja a {porDarDeBaja.nombre}? Queda inactivo y se conserva lo que gestionó. No
            se puede dar de baja al último admin.
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
      {darDeBaja.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensajeDeError(darDeBaja.error)}
        </p>
      )}
      {isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar los usuarios. Probá de nuevo en unos minutos.
        </p>
      ) : (
        data &&
        (data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay usuarios para mostrar.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">Usuario</th>
                  <th className="py-2 font-medium">Rol</th>
                  <th className="py-2 font-medium">Acceso a redes</th>
                  <th className="py-2 font-medium">Estado</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((usuario) => (
                  <tr key={usuario.id} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{usuario.nombre}</div>
                      <div className="text-muted-foreground">{usuario.email}</div>
                    </td>
                    <td className="py-2">{etiquetaDeRol(usuario.rol)}</td>
                    <td className="py-2">{accesoARedes(usuario)}</td>
                    <td className="py-2">{usuario.activo ? "Activo" : "Inactivo"}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormulario(usuario);
                          }}
                        >
                          Editar
                        </Button>
                        {usuario.activo && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={darDeBaja.isPending}
                            onClick={() => {
                              setPorDarDeBaja(usuario);
                            }}
                          >
                            Dar de baja
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
                Mostramos {data.items.length} de {data.total} usuarios.
              </p>
            )}
          </>
        ))
      )}
    </div>
  );
}
