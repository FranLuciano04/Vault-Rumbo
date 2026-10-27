import { zodResolver } from "@hookform/resolvers/zod";
import { ErrorApi, type Cliente } from "@rumbo/shared";
import { esquemaAltaCliente } from "@rumbo/shared/esquemas";
import { useCrearCliente } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvisoDuplicado } from "@/features/clientes/AvisoDuplicado";
import { aplicarErroresDelServidor } from "@/lib/errores";

const esquemaAltaRapida = esquemaAltaCliente.pick({ nombre: true, contacto: true });
type Datos = z.infer<typeof esquemaAltaRapida>;
const CAMPOS = ["nombre", "contacto"] as const;

/**
 * Alta rápida de cliente dentro de la consulta (CU-04 A1, RF-004): nombre y contacto; el resto de
 * la ficha se completa después. Avisa los posibles duplicados (RF-003). No es un `<form>` porque
 * vive junto al formulario de la consulta.
 */
export function AltaRapidaCliente({
  cliente,
  alCrear,
  alCancelar,
}: {
  cliente: AxiosInstance;
  alCrear: (nuevo: Cliente) => void;
  alCancelar: () => void;
}) {
  const crear = useCrearCliente(cliente);
  const [error, setError] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<Cliente[] | null>(null);
  const formulario = useForm<Datos>({
    resolver: zodResolver(esquemaAltaRapida),
    defaultValues: { nombre: "", contacto: "" },
  });
  const { errors } = formulario.formState;
  const { setFocus, subscribe } = formulario;

  useEffect(() => {
    setFocus("nombre");
  }, [setFocus]);

  // Editar un dato tras el aviso obliga a volver a chequear.
  useEffect(() => {
    return subscribe({
      formState: { values: true },
      callback: () => {
        setDuplicados(null);
      },
    });
  }, [subscribe]);

  async function guardar(datos: Datos, confirmarDuplicado: boolean) {
    setError(null);
    setDuplicados(null);
    try {
      alCrear(
        await crear.mutateAsync({
          ...datos,
          segmento: "individual",
          ...(confirmarDuplicado && { confirmar_duplicado: true }),
        }),
      );
    } catch (falla) {
      if (falla instanceof ErrorApi && falla.status === 409 && falla.duplicados) {
        setDuplicados(falla.duplicados);
        return;
      }
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  const guardarConDatos = (confirmarDuplicado: boolean) =>
    void formulario.handleSubmit((datos) => guardar(datos, confirmarDuplicado))();

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      onKeyDown={(evento) => {
        // Enter no debe mandar la consulta de al lado.
        if (evento.key === "Enter" && evento.target instanceof HTMLInputElement) {
          evento.preventDefault();
          guardarConDatos(false);
        }
      }}
    >
      <CampoFormulario id="alta-nombre" etiqueta="Nombre y apellido o grupo" error={errors.nombre}>
        {(props) => <Input {...props} {...formulario.register("nombre")} />}
      </CampoFormulario>
      <CampoFormulario
        id="alta-contacto"
        etiqueta="Contacto (teléfono o email)"
        error={errors.contacto}
      >
        {(props) => <Input {...props} {...formulario.register("contacto")} />}
      </CampoFormulario>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {duplicados && (
        <AvisoDuplicado
          candidatos={duplicados}
          enviando={crear.isPending}
          textoConfirmar="Confirmar alta"
          alConfirmar={() => {
            guardarConDatos(true);
          }}
        />
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={crear.isPending}
          onClick={() => {
            guardarConDatos(false);
          }}
        >
          Guardar cliente
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
