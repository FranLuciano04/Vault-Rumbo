import { zodResolver } from "@hookform/resolvers/zod";
import { ErrorApi } from "@rumbo/shared";
import { type DatosInicioSesion, esquemaInicioSesion } from "@rumbo/shared/esquemas";
import { consultaYo } from "@rumbo/shared/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { ArrowRight, CircleAlert, Compass, UsersRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cerrarSesion,
  enviarMailRecuperacion,
  iniciarSesionConEmail,
  iniciarSesionConGoogle,
} from "@/lib/firebase";
import {
  MAIL_RECUPERACION,
  mensajeErrorFirebase,
  NO_HABILITADO,
  REVISAR_CAMPOS,
  SIN_VERIFICAR,
} from "./mensajesInicioSesion";

/**
 * Inicio de sesión (CU-24, pantallas 1 y 2 del prototipo): Firebase autentica y después
 * `/auth/yo` confirma que la persona es un Usuario habilitado de Rumbo (A1).
 */
export function PaginaLogin({ cliente }: { cliente: AxiosInstance }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const formulario = useForm<DatosInicioSesion>({
    resolver: zodResolver(esquemaInicioSesion),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = formulario.formState;
  const [error, setError] = useState<string | null>(null);
  const [mailEnviado, setMailEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(iniciarSesion: () => Promise<void>) {
    formulario.clearErrors();
    setError(null);
    setMailEnviado(false);
    setOcupado(true);
    try {
      await iniciarSesion();
    } catch (falla) {
      setError(mensajeErrorFirebase(falla));
      setOcupado(false);
      return;
    }
    try {
      await queryClient.query({ ...consultaYo(cliente), retry: false });
      void navigate("/", { replace: true });
    } catch (falla) {
      // Autenticado en Firebase pero sin Usuario activo en Rumbo: no queda sesión abierta (A1).
      setError(falla instanceof ErrorApi && falla.status === 401 ? NO_HABILITADO : SIN_VERIFICAR);
      setOcupado(false);
      await cerrarSesion();
    }
  }

  async function pedirMailRecuperacion() {
    setError(null);
    setMailEnviado(false);
    if (!(await formulario.trigger("email"))) return;
    try {
      await enviarMailRecuperacion(formulario.getValues("email"));
    } catch {
      // A4: el mensaje es el mismo exista o no la cuenta, para no revelar qué emails tienen usuario.
    }
    setMailEnviado(true);
  }

  const aviso = error ?? (Object.keys(errors).length > 0 ? REVISAR_CAMPOS : null);

  return (
    <div className="flex min-h-screen bg-secondary/40 p-3 text-foreground">
      <PanelMarca />
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresá con tu usuario de la agencia.
          </p>

          {aviso && (
            <div
              role="alert"
              className="mt-6 flex gap-3 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive"
            >
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>{aviso}</p>
            </div>
          )}
          {mailEnviado && (
            <p
              role="status"
              className="mt-6 rounded-md bg-secondary p-3 text-sm text-secondary-foreground"
            >
              {MAIL_RECUPERACION}
            </p>
          )}

          <form
            noValidate
            className="mt-6 flex flex-col gap-5"
            onSubmit={(evento) =>
              void formulario.handleSubmit(({ email, password }) =>
                entrar(() => iniciarSesionConEmail(email, password)),
              )(evento)
            }
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                aria-invalid={Boolean(errors.email || error)}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...formulario.register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password || error)}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...formulario.register("password")}
              />
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
              <Button
                variant="link"
                size="sm"
                className="self-end px-0"
                disabled={ocupado}
                onClick={() => void pedirMailRecuperacion()}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
            <Button type="submit" size="lg" disabled={ocupado}>
              <ArrowRight aria-hidden />
              Ingresar
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={ocupado}
            onClick={() => void entrar(iniciarSesionConGoogle)}
          >
            <UsersRound aria-hidden />
            Continuar con Google
          </Button>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿No tenés usuario? Pedíselo al administrador de la agencia.
          </p>
        </div>
      </main>
    </div>
  );
}

/** Panel decorativo de la izquierda del prototipo; en pantallas chicas se oculta. */
function PanelMarca() {
  return (
    <aside className="hidden w-1/2 max-w-3xl flex-col justify-between rounded-xl bg-linear-to-br from-primary to-ring p-10 text-primary-foreground lg:flex">
      <div className="flex items-center gap-3 text-xl font-bold">
        <span className="flex size-11 items-center justify-center rounded-md bg-primary">
          <Compass aria-hidden className="size-5" />
        </span>
        Rumbo
      </div>
      <div>
        <p className="text-4xl leading-tight font-bold">
          Cada consulta,
          <br />
          en rumbo a una venta.
        </p>
        <p className="mt-4 max-w-sm text-sm text-primary-foreground/80">
          Clientes, cotizaciones, viajes, cobros y alertas de tu agencia en un solo lugar.
        </p>
      </div>
    </aside>
  );
}
