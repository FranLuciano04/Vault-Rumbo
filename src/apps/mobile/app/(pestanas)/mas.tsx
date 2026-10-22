import type { UsuarioActual } from "@rumbo/shared";
import { useYo } from "@rumbo/shared/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { cliente } from "../../src/cliente";
import { cerrarSesion } from "../../src/lib/firebase";

const ETIQUETA_ROL: Record<UsuarioActual["rol"], string> = {
  empleado: "Empleado",
  admin: "Admin",
  dueno: "Dueño",
  freelance: "Freelance",
};

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

/** Pestaña Más (CU-24, pantalla 59 del prototipo): perfil de la sesión y cierre de sesión (A3). */
export default function Mas() {
  const { data: usuario } = useYo(cliente);
  const queryClient = useQueryClient();

  async function salir() {
    try {
      await cerrarSesion();
    } catch {
      // Se traga para no dejar una promesa rechazada sin manejar: el cierre local sigue igual.
    } finally {
      // Aunque signOut falle, los datos de la persona no quedan en pantalla ni en caché.
      router.replace("/login");
      queryClient.clear();
    }
  }

  return (
    <ScrollView
      testID="pantalla-mas"
      className="flex-1 bg-secondary"
      contentContainerClassName="gap-4 px-4 pb-6 pt-12"
    >
      <Text role="heading" className="text-sm font-semibold text-gray-900">
        Más
      </Text>

      {usuario && (
        <View className="items-center rounded-2xl bg-white p-6">
          <View className="size-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-lg font-semibold text-white">{iniciales(usuario.nombre)}</Text>
          </View>
          <Text className="mt-3 text-xl font-bold text-gray-900">{usuario.nombre}</Text>
          <Text className="mt-1 text-sm text-gray-500">{usuario.email}</Text>
          <View className="mt-2 rounded-full bg-secondary px-3 py-1">
            <Text className="text-xs font-semibold text-primary">{ETIQUETA_ROL[usuario.rol]}</Text>
          </View>
        </View>
      )}

      <View className="rounded-2xl bg-white p-4">
        <Text className="text-xs font-semibold tracking-wide text-gray-500">EN EL TELÉFONO</Text>
        <Text className="mt-2 text-sm leading-5 text-gray-900">
          Desde la app ves tu agenda y tus alertas, creás recordatorios y consultás o das de alta
          clientes. Para cotizar, gestionar viajes y registrar cobros, usá Rumbo en la web.
        </Text>
      </View>

      <Pressable
        role="button"
        onPress={() => void salir()}
        className="items-center rounded-xl border border-border bg-white py-3"
      >
        <Text className="font-semibold text-gray-900">Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
