import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PaginaLogin } from "@/features/seguridad/PaginaLogin";
import { RutaProtegida } from "./RutaProtegida";
import { SeccionClientes } from "./SeccionClientes";
import { SeccionConfiguracion } from "./SeccionConfiguracion";
import { SeccionFichaCliente } from "./SeccionFichaCliente";
import { SeccionPendiente } from "./SeccionPendiente";

export function App({ cliente }: { cliente: AxiosInstance }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PaginaLogin cliente={cliente} />} />
          <Route element={<RutaProtegida cliente={cliente} />}>
            <Route index element={<Navigate to="/agenda" replace />} />
            <Route path="configuracion" element={<SeccionConfiguracion cliente={cliente} />} />
            <Route path="clientes" element={<SeccionClientes cliente={cliente} />} />
            <Route path="clientes/:id" element={<SeccionFichaCliente cliente={cliente} />} />
            <Route path=":seccion" element={<SeccionPendiente />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
