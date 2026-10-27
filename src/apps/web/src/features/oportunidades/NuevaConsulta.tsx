import { zodResolver } from "@hookform/resolvers/zod";
import type { Oportunidad, UsuarioActual } from "@rumbo/shared";
import { useOportunidades, useRegistrarConsulta } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button, variantesBoton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { AvisoOportunidadAbierta } from "./AvisoOportunidadAbierta";
import { BuscadorCliente, type ClienteElegido } from "./BuscadorCliente";
import { esquemaConsulta, type DatosConsulta, type EntradaConsulta } from "./esquemas";

const CAMPOS = [
  "cliente_id",
  "canal",
  "destino_consultado",
  "fecha_desde_tentativa",
  "fecha_hasta_tentativa",
  "pasajeros",
  "notas",
] as const;

const CLASE_TEXTAREA =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive";

/** Una oportunidad abierta es la que sigue en el embudo: ni ganada ni perdida. */
const estaAbierta = ({ estado }: Oportunidad) => estado !== "ganada" && estado !== "perdida";

/**
 * Trae las oportunidades abiertas del cliente elegido (RF-012) y se las pasa a `children`
 * mientras carga (`null`) y cuando llegan; si no se pueden traer, se registra sin aviso.
 */
function ConOportunidadesAbiertas({
  cliente,
  clienteId,
  children,
}: {
  cliente: AxiosInstance;
  clienteId: string;
  children: (abiertas: Oportunidad[] | null) => ReactNode;
}) {
  const { data, isPending } = useOportunidades(cliente, { cliente_id: clienteId });
  return children(isPending ? null : (data?.items.filter(estaAbierta) ?? []));
}

/**
 * Registro de una consulta (CU-04, pantalla 11): cliente buscado o dado de alta en el momento
 * (A1), aviso si ya tiene una oportunidad abierta (A2) y datos mínimos validados (A3).
 */
export function NuevaConsulta({ cliente }: { cliente: AxiosInstance; usuario: UsuarioActual }) {
  const registrar = useRegistrarConsulta(cliente);
  const navegar = useNavigate();
  const [elegido, setElegido] = useState<ClienteElegido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<EntradaConsulta, unknown, DatosConsulta>({
    resolver: zodResolver(esquemaConsulta),
    defaultValues: {
      cliente_id: "",
      destino_consultado: "",
      fecha_desde_tentativa: "",
      fecha_hasta_tentativa: "",
      pasajeros: 1,
      notas: "",
    },
  });
  const { errors } = formulario.formState;

  function elegirCliente(nuevo: ClienteElegido | null) {
    setElegido(nuevo);
    formulario.setValue("cliente_id", nuevo?.id ?? "", {
      shouldValidate: formulario.formState.isSubmitted,
    });
  }

  async function enviar(datos: DatosConsulta) {
    setError(null);
    try {
      const nueva = await registrar.mutateAsync({
        cliente_id: datos.cliente_id,
        canal: datos.canal,
        destino_consultado: datos.destino_consultado,
        pasajeros: datos.pasajeros,
        fecha_desde_tentativa: datos.fecha_desde_tentativa || null,
        fecha_hasta_tentativa: datos.fecha_hasta_tentativa || null,
        notas: datos.notas.trim() || null,
      });
      void navegar(`/oportunidades/${nueva.id}`);
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  const acciones = (abiertas: Oportunidad[] | null) => {
    const conAviso = abiertas !== null && abiertas.length > 0;
    return (
      <>
        {conAviso && (
          <AvisoOportunidadAbierta
            abiertas={abiertas}
            enviando={registrar.isPending}
            alRegistrarIgual={() => void formulario.handleSubmit(enviar)()}
          />
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={registrar.isPending || abiertas === null || conAviso}>
            Registrar consulta
          </Button>
          <Link to="/oportunidades" className={variantesBoton({ variant: "outline" })}>
            Cancelar
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Oportunidades
        </p>
        <h1 className="text-3xl font-semibold">Nueva consulta</h1>
      </header>
      <section className="rounded-2xl border bg-card p-5">
        <BuscadorCliente
          cliente={cliente}
          elegido={elegido}
          error={errors.cliente_id?.message}
          alElegir={elegirCliente}
        />
      </section>
      <form
        noValidate
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
        onSubmit={(evento) => void formulario.handleSubmit(enviar)(evento)}
      >
        <CampoFormulario id="canal" etiqueta="Canal" error={errors.canal}>
          {(props) => (
            <select className={CLASE_SELECT} {...props} {...formulario.register("canal")}>
              <option value="">Elegí el canal</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="presencial">Presencial</option>
            </select>
          )}
        </CampoFormulario>
        <CampoFormulario id="destino" etiqueta="Destino" error={errors.destino_consultado}>
          {(props) => <Input {...props} {...formulario.register("destino_consultado")} />}
        </CampoFormulario>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFormulario id="desde" etiqueta="Fecha desde" error={errors.fecha_desde_tentativa}>
            {(props) => (
              <Input type="date" {...props} {...formulario.register("fecha_desde_tentativa")} />
            )}
          </CampoFormulario>
          <CampoFormulario id="hasta" etiqueta="Fecha hasta" error={errors.fecha_hasta_tentativa}>
            {(props) => (
              <Input type="date" {...props} {...formulario.register("fecha_hasta_tentativa")} />
            )}
          </CampoFormulario>
        </div>
        <CampoFormulario id="pasajeros" etiqueta="Pasajeros" error={errors.pasajeros}>
          {(props) => (
            <Input
              type="number"
              min={1}
              {...props}
              {...formulario.register("pasajeros", { valueAsNumber: true })}
            />
          )}
        </CampoFormulario>
        <CampoFormulario id="notas" etiqueta="Notas" error={errors.notas}>
          {(props) => (
            <textarea
              rows={3}
              className={CLASE_TEXTAREA}
              {...props}
              {...formulario.register("notas")}
            />
          )}
        </CampoFormulario>
        {elegido ? (
          <ConOportunidadesAbiertas key={elegido.id} cliente={cliente} clienteId={elegido.id}>
            {acciones}
          </ConOportunidadesAbiertas>
        ) : (
          acciones([])
        )}
      </form>
    </div>
  );
}
