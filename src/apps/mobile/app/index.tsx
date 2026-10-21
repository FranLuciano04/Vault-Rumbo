import { Redirect, useNavigationContainerRef } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

// Pantalla de arranque: una vez montado el router redirige a la agenda y la guarda de
// `(pestanas)` manda al login si no hay sesión.
export default function Inicio() {
  const navegacion = useNavigationContainerRef();
  const [routerListo, setRouterListo] = useState(false);
  useEffect(() => {
    // El estado del router no es reactivo: se consulta una vez montada la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRouterListo(navegacion.isReady());
  }, [navegacion]);

  if (routerListo) return <Redirect href="/agenda" />;
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-primary">Rumbo</Text>
    </View>
  );
}
