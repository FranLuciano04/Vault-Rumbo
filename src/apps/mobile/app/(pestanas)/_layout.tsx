import { ErrorApi } from "@rumbo/shared";
import { useYo } from "@rumbo/shared/hooks";
import { Redirect, Tabs } from "expo-router";
import { crearBotonPestana } from "../../src/componentes/BotonPestana";
import { cliente } from "../../src/cliente";

const PESTANAS = [
  { name: "agenda", titulo: "Agenda" },
  { name: "clientes", titulo: "Clientes" },
  { name: "mas", titulo: "Más" },
];

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
      {PESTANAS.map(({ name, titulo }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: titulo, tabBarButton: crearBotonPestana(titulo) }}
        />
      ))}
    </Tabs>
  );
}
