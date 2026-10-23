import { ErrorApi } from "@rumbo/shared";
import { esquemaInicioSesion } from "@rumbo/shared/esquemas";
import { consultaYo } from "@rumbo/shared/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { type ComponentProps, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { cliente } from "../../src/cliente";
import {
  cerrarSesion,
  enviarMailRecuperacion,
  iniciarSesionConEmail,
  iniciarSesionConGoogle,
} from "../../src/lib/firebase";
import {
  MAIL_RECUPERACION,
  mensajeErrorFirebase,
  NO_HABILITADO,
  REVISAR_CAMPOS,
  SIN_VERIFICAR,
} from "../../src/lib/mensajesInicioSesion";

type ErroresCampos = { email?: string; password?: string };

/**
 * Inicio de sesión mobile (CU-24, pantalla 52 del prototipo): Firebase autentica y después
 * `/auth/yo` confirma que la persona es un Usuario habilitado de Rumbo (A1).
 */
export default function Login() {
  const queryClient = useQueryClient();
  const router = useRouter();
  // Inputs no controlados: los valores se leen al enviar, sin esperar al próximo render.
  const valores = useRef({ email: "", password: "" });
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [error, setError] = useState<string | null>(null);
  const [mailEnviado, setMailEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(iniciarSesion: () => Promise<void>) {
    setErrores({});
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
      router.replace("/");
    } catch (falla) {
      // Autenticado en Firebase pero sin Usuario activo en Rumbo: no queda sesión abierta (A1).
      setError(falla instanceof ErrorApi && falla.status === 401 ? NO_HABILITADO : SIN_VERIFICAR);
      try {
        await cerrarSesion();
      } catch {
        // Si signOut falla igual se muestra el aviso; el próximo intento vuelve a pasar por /auth/yo.
      } finally {
        setOcupado(false);
      }
    }
  }

  function ingresarConEmail() {
    const datos = esquemaInicioSesion.safeParse(valores.current);
    if (!datos.success) {
      const mensajeDe = (campo: keyof ErroresCampos) =>
        datos.error.issues.find((problema) => problema.path[0] === campo)?.message;
      setError(null);
      setMailEnviado(false);
      setErrores({ email: mensajeDe("email"), password: mensajeDe("password") });
      return;
    }
    void entrar(() => iniciarSesionConEmail(datos.data.email, datos.data.password));
  }

  async function pedirMailRecuperacion() {
    setError(null);
    setMailEnviado(false);
    const valido = esquemaInicioSesion.shape.email.safeParse(valores.current.email);
    if (!valido.success) {
      setErrores({ email: valido.error.issues[0]?.message });
      return;
    }
    setErrores({});
    try {
      await enviarMailRecuperacion(valido.data);
    } catch {
      // A4: el mensaje es el mismo exista o no la cuenta, para no revelar qué emails tienen usuario.
    }
    setMailEnviado(true);
  }

  const aviso = error ?? (errores.email || errores.password ? REVISAR_CAMPOS : null);

  return (
    <ScrollView
      testID="pantalla-login"
      className="flex-1 bg-secondary"
      contentContainerClassName="grow justify-center px-4 py-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center">
        <View className="size-16 items-center justify-center rounded-full bg-primary">
          <View className="size-6 rounded-full border-2 border-white" />
        </View>
        <Text role="heading" className="mt-4 text-3xl font-bold text-gray-900">
          Rumbo
        </Text>
        <Text className="mt-3 text-sm text-gray-500">Ingresá con tu usuario de la agencia</Text>
      </View>

      {aviso && (
        <View accessible role="alert" className="mt-6 rounded-md bg-red-50 p-3">
          <Text className="text-sm font-medium text-red-700">{aviso}</Text>
        </View>
      )}
      {mailEnviado && (
        <View accessible role="status" className="mt-6 rounded-md bg-white p-3">
          <Text className="text-sm text-primary">{MAIL_RECUPERACION}</Text>
        </View>
      )}

      <Campo
        etiqueta="Email"
        error={errores.email}
        alCambiar={(texto) => (valores.current.email = texto)}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo
        etiqueta="Contraseña"
        error={errores.password}
        alCambiar={(texto) => (valores.current.password = texto)}
        secureTextEntry
        autoComplete="current-password"
      />
      <Pressable
        role="button"
        disabled={ocupado}
        onPress={() => void pedirMailRecuperacion()}
        className="mt-2 self-end py-1"
      >
        <Text className="text-xs font-semibold text-primary">¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <Pressable
        role="button"
        disabled={ocupado}
        onPress={ingresarConEmail}
        className="mt-4 items-center rounded-xl bg-primary py-3.5 disabled:opacity-60"
      >
        <Text className="font-semibold text-white">Ingresar</Text>
      </Pressable>
      <Pressable
        role="button"
        disabled={ocupado}
        onPress={() => void entrar(iniciarSesionConGoogle)}
        className="mt-3 items-center rounded-xl border border-border bg-white py-3.5 disabled:opacity-60"
      >
        <Text className="font-semibold text-gray-900">Continuar con Google</Text>
      </Pressable>

      <Text className="mt-4 text-center text-xs text-gray-500">
        ¿No tenés usuario? Pedíselo al administrador de la agencia.
      </Text>
    </ScrollView>
  );
}

type PropsCampo = Pick<
  ComponentProps<typeof TextInput>,
  "keyboardType" | "autoComplete" | "secureTextEntry"
> & {
  etiqueta: string;
  error?: string;
  alCambiar: (valor: string) => void;
};

function Campo({ etiqueta, error, alCambiar, ...props }: PropsCampo) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-xs font-semibold text-gray-900">{etiqueta}</Text>
      <TextInput
        aria-label={etiqueta}
        autoCapitalize="none"
        onChangeText={alCambiar}
        className={`rounded-xl border bg-white px-4 py-3 text-base text-gray-900 ${error ? "border-red-600" : "border-border"}`}
        {...props}
      />
      {error && <Text className="mt-1 text-xs text-red-700">{error}</Text>}
    </View>
  );
}
