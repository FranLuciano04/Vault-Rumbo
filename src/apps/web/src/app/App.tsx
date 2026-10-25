import { crearQueryClient } from "@rumbo/shared/query";
import { QueryClientProvider } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PaginaLogin } from "@/features/seguridad/PaginaLogin";
import { RutaProtegida } from "./RutaProtegida";
import { SeccionAgenda } from "./SeccionAgenda";
import { SeccionClientes } from "./SeccionClientes";
import { SeccionConfiguracion } from "./SeccionConfiguracion";
import { SeccionFichaCliente } from "./SeccionFichaCliente";
import { SeccionNuevoCliente } from "./SeccionNuevoCliente";
import { SeccionPendiente } from "./SeccionPendiente";

export function App({ cliente }: { cliente: AxiosInstance }) {
  const [queryClient] = useState(() => crearQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PaginaLogin cliente={cliente} />} />
          <Route element={<RutaProtegida cliente={cliente} />}>
            <Route index element={<Navigate to="/agenda" replace />} />
            <Route path="agenda" element={<SeccionAgenda cliente={cliente} />} />
            <Route path="configuracion" element={<SeccionConfiguracion cliente={cliente} />} />
            <Route path="clientes" element={<SeccionClientes cliente={cliente} />} />
            <Route path="clientes/nuevo" element={<SeccionNuevoCliente cliente={cliente} />} />
            <Route path="clientes/:id" element={<SeccionFichaCliente cliente={cliente} />} />
            <Route path=":seccion/*" element={<SeccionPendiente />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
