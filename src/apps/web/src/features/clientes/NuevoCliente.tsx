import { zodResolver } from "@hookform/resolvers/zod";
import { ETIQUETA_SEGMENTO, ErrorApi, type Cliente, type UsuarioActual } from "@rumbo/shared";
import { useCrearCliente } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { Button, variantesBoton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import {
  CAMPOS,
  datosParaLaApi,
  esquemaFicha,
  SelectorAsesor,
  type DatosFicha,
  type EntradaFicha,
} from "./FormularioCliente";

const AVISO_CLIENTE_AJENO =
  "Ya hay un cliente con ese contacto en la agencia. Consultalo con un admin";

/** Aviso de posible duplicado (CU-02 A1): los candidatos con acceso a su ficha, o el aviso del freelance. */
function AvisoDuplicado({
  candidatos,
  enviando,
  alConfirmar,
}: {
  candidatos: Cliente[];
  enviando: boolean;
  alConfirmar: () => void;
}) {
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        Posible cliente duplicado
      </h2>
      {candidatos.length === 0 ? (
        <p>{AVISO_CLIENTE_AJENO}</p>
      ) : (
        <>
          <p>
            Ya hay clientes parecidos (mismo contacto o nombre). Si es la misma persona, abrí su
            ficha.
          </p>
          <ul className="flex flex-col gap-2">
            {candidatos.map(({ id, nombre, contacto }) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium">{nombre}</span>
                  <span>{contacto}</span>
                </div>
                <Link to={`/clientes/${id}`} className={variantesBoton({ variant: "outline" })}>
                  Ir al cliente existente
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <div>
        <Button type="button" disabled={enviando} onClick={alConfirmar}>
          Confirmar alta
        </Button>
      </div>
    </section>
  );
}

/**
 * Alta de cliente (CU-02, pantalla 9): valida el formato, avisa los posibles duplicados (RF-003)
 * y abre la ficha al terminar. El freelance no elige asesor: sus clientes quedan a su nombre (RF-150).
 */
export function NuevoCliente({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const crear = useCrearCliente(cliente);
  const navegar = useNavigate();
  const conAsesor = usuario.rol !== "freelance";
  const [error, setError] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<Cliente[] | null>(null);
  const formulario = useForm<EntradaFicha, unknown, DatosFicha>({
    resolver: zodResolver(esquemaFicha),
    defaultValues: {
      nombre: "",
      contacto: "",
      instagram: "",
      segmento: "individual",
      preferencias: "",
      asesor_asignado_id: "",
    },
  });
  const { errors } = formulario.formState;
  const { setFocus } = formulario;

  useEffect(() => {
    setFocus("nombre");
  }, [setFocus]);

  async function enviar(datos: DatosFicha, confirmarDuplicado: boolean) {
    setError(null);
    setDuplicados(null);
    try {
      const nuevo = await crear.mutateAsync({
        ...datosParaLaApi(datos, conAsesor),
        ...(confirmarDuplicado && { confirmar_duplicado: true }),
      });
      void navegar(`/clientes/${nuevo.id}`);
    } catch (falla) {
      if (falla instanceof ErrorApi && falla.status === 409 && falla.duplicados) {
        setDuplicados(falla.duplicados);
        return;
      }
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Clientes
        </p>
        <h1 className="text-3xl font-semibold">Nuevo cliente</h1>
      </header>
      <form
        noValidate
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
        onSubmit={(evento) => void formulario.handleSubmit((datos) => enviar(datos, false))(evento)}
      >
        <CampoFormulario id="nombre" etiqueta="Nombre y apellido o grupo" error={errors.nombre}>
          {(props) => <Input {...props} {...formulario.register("nombre")} />}
        </CampoFormulario>
        <CampoFormulario
          id="contacto"
          etiqueta="Contacto (teléfono o email)"
          error={errors.contacto}
        >
          {(props) => <Input {...props} {...formulario.register("contacto")} />}
        </CampoFormulario>
        <CampoFormulario
          id="instagram"
          etiqueta="Instagram (opcional)"
          error={errors.instagram as FieldError | undefined}
        >
          {(props) => <Input {...props} {...formulario.register("instagram")} />}
        </CampoFormulario>
        <CampoFormulario id="segmento" etiqueta="Segmento" error={errors.segmento}>
          {(props) => (
            <select className={CLASE_SELECT} {...props} {...formulario.register("segmento")}>
              {Object.entries(ETIQUETA_SEGMENTO).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          )}
        </CampoFormulario>
        <CampoFormulario id="preferencias" etiqueta="Preferencias" error={errors.preferencias}>
          {(props) => (
            <textarea
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
              {...props}
              {...formulario.register("preferencias")}
            />
          )}
        </CampoFormulario>
        {conAsesor && (
          <SelectorAsesor cliente={cliente} actual={null} control={formulario.control} />
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        {duplicados && (
          <AvisoDuplicado
            candidatos={duplicados}
            enviando={crear.isPending}
            alConfirmar={() => void formulario.handleSubmit((datos) => enviar(datos, true))()}
          />
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={crear.isPending}>
            Registrar cliente
          </Button>
          <Link to="/clientes" className={variantesBoton({ variant: "outline" })}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
