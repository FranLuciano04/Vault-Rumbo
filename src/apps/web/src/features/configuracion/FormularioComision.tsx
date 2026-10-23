import { zodResolver } from "@hookform/resolvers/zod";
import { useConfigurarComisionPorDefecto, useUsuarios } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario, CLASE_SELECT } from "./CampoFormulario";
import { aplicarErroresDelServidor } from "./errores";
import { type DatosComision, esquemaComision } from "./esquemas";

const CAMPOS = ["comision_default_tipo", "comision_default_valor"] as const;

/** Comisión por defecto de cada vendedor (RF-083, CU-13), incluidos los usuarios dados de baja. */
export function FormularioComision({ cliente }: { cliente: AxiosInstance }) {
  const { data: usuarios, isError } = useUsuarios(cliente, { por_pagina: 100 });
  const configurar = useConfigurarComisionPorDefecto(cliente);
  const [usuarioId, setUsuarioId] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elegido = usuarios?.items.find(({ id }) => id === usuarioId);
  const formulario = useForm<DatosComision>({
    resolver: zodResolver(esquemaComision),
    values: {
      comision_default_tipo: elegido?.comision_default_tipo ?? "porcentaje",
      // Sin comisión cargada el valor queda vacío ("" limpia el campo) para que haya que cargarlo.
      comision_default_valor: (elegido?.comision_default_valor == null
        ? ""
        : Number(elegido.comision_default_valor)) as number,
    },
  });
  const { errors } = formulario.formState;

  function elegirVendedor(id: string) {
    setUsuarioId(id);
    setGuardado(false);
    setError(null);
    formulario.clearErrors();
  }

  async function guardar(datos: DatosComision) {
    setGuardado(false);
    setError(null);
    try {
      await configurar.mutateAsync({ usuarioId, datos });
      setGuardado(true);
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  if (isError)
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        No pudimos cargar los vendedores. Probá de nuevo en unos minutos.
      </p>
    );

  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-5"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <h2 className="text-lg font-semibold">Comisión por defecto</h2>
      <CampoFormulario id="vendedor" etiqueta="Vendedor">
        {(props) => (
          <select
            className={CLASE_SELECT}
            {...props}
            value={usuarioId}
            onChange={(evento) => {
              elegirVendedor(evento.target.value);
            }}
          >
            <option value="">Elegí un vendedor</option>
            {usuarios?.items.map(({ id, nombre, activo }) => (
              <option key={id} value={id}>
                {activo ? nombre : `${nombre} (de baja)`}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario
        id="tipo-comision"
        etiqueta="Tipo de comisión"
        error={errors.comision_default_tipo}
      >
        {(props) => (
          <select
            className={CLASE_SELECT}
            {...props}
            {...formulario.register("comision_default_tipo")}
          >
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="importe">Importe fijo</option>
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario
        id="valor-comision"
        etiqueta="Valor de la comisión"
        error={errors.comision_default_valor}
      >
        {(props) => (
          <Input
            type="number"
            step="0.01"
            {...props}
            {...formulario.register("comision_default_valor", { valueAsNumber: true })}
          />
        )}
      </CampoFormulario>
      {elegido?.comision_default_tipo == null && elegido && (
        <p className="text-sm text-muted-foreground">Sin comisión configurada.</p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {guardado && (
        <p role="status" className="text-sm text-muted-foreground">
          Comisión guardada.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={!usuarioId || configurar.isPending}>
        Guardar comisión
      </Button>
    </form>
  );
}
