import { ErrorApi } from "@rumbo/shared";
import { useYo } from "@rumbo/shared/hooks";
import { Redirect, Tabs } from "expo-router";
import { crearBotonPestana } from "../../src/componentes/BotonPestana";
import { cliente } from "../../src/cliente";

export default function LayoutPestanas() {
  const yo = useYo(cliente);
  if (yo.isPending) return null;
  if (yo.error instanceof ErrorApi && yo.error.status === 401) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopColor: "#d9d9d9" },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{ title: "Agenda", tabBarButton: crearBotonPestana("Agenda") }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: "Clientes", tabBarButton: crearBotonPestana("Clientes") }}
      />
      <Tabs.Screen name="mas" options={{ title: "Más", tabBarButton: crearBotonPestana("Más") }} />
    </Tabs>
  );
}
