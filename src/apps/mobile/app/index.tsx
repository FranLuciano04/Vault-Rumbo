import { Redirect } from "expo-router";

// La guarda de `(pestanas)` manda al login si no hay sesión.
export default function Inicio() {
  return <Redirect href="/agenda" />;
}
