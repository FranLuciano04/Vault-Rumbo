import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cerrarSesion } from "@/lib/firebase";

/** Cierra la sesión de Firebase y descarta los datos en caché de la persona (CU-24 A3). */
export function BotonCerrarSesion() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function salir() {
    try {
      await cerrarSesion();
    } catch {
      // Se traga para no dejar una promesa rechazada sin manejar: el cierre local sigue igual.
    } finally {
      // Aunque signOut falle, los datos de la persona no quedan en pantalla ni en caché.
      void navigate("/login", { replace: true });
      queryClient.clear();
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void salir()}>
      <LogOut aria-hidden />
      Cerrar sesión
    </Button>
  );
}
