import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { RutaProtegida } from "./RutaProtegida";
import { SeccionPendiente } from "./SeccionPendiente";

export function App({ cliente }: { cliente: AxiosInstance }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* El login es del ticket siguiente. */}
          <Route path="/login" element={<p className="p-6">Iniciar sesión</p>} />
          <Route element={<RutaProtegida cliente={cliente} />}>
            <Route index element={<Navigate to="/agenda" replace />} />
            <Route path=":seccion" element={<SeccionPendiente />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
