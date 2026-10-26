import { ErrorApi } from "@rumbo/shared";
import { useYo } from "@rumbo/shared/hooks";
import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import { crearBotonPestana } from "../../src/componentes/BotonPestana";
import { cliente } from "../../src/cliente";

const PESTANAS = [
  { name: "agenda", titulo: "Agenda" },
  { name: "clientes", titulo: "Clientes" },
  { name: "mas", titulo: "Más" },
];

export default function LayoutPestanas() {
  const { data: usuario, error, isPending } = useYo(cliente);
  if (isPending)
    return (
      <View accessible role="status" className="flex-1 items-center justify-center bg-white">
        <Text>Cargando…</Text>
      </View>
    );
  if (error instanceof ErrorApi && error.status === 401) return <Redirect href="/login" />;
  if (!usuario)
    return (
      <View accessible role="alert" className="flex-1 items-center justify-center bg-white p-6">
        <Text>No pudimos verificar tu sesión. Probá de nuevo en unos minutos.</Text>
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopColor: "#d9d9d9" },
      }}
    >
      {PESTANAS.map(({ name, titulo }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: titulo, tabBarButton: crearBotonPestana(titulo) }}
        />
      ))}
      {/* El detalle de una alerta se abre desde la agenda: no tiene pestaña propia. */}
      <Tabs.Screen name="alertas" options={{ href: null }} />
    </Tabs>
  );
}
