import { Stack } from "expo-router";

// El detalle de una alerta vive en la pila de la pestaña Agenda: «Volver» siempre cae en la agenda.
export default function LayoutAgenda() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
