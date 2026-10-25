import { crearCliente } from "@rumbo/shared";
import { alertasMock, crearServidor, manejadoresAlertas } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { useResolverConDeshacer } from "./useResolverConDeshacer";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
const envoltorio = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("RF-076 resolver con deshacer (hook)", () => {
  it("RF-076 al salir de la pantalla envía la resolución que estaba esperando", async () => {
    const resueltas: string[] = [];
    servidor.use(
      http.post("*/api/alertas/:id/resolver", ({ params }) => {
        resueltas.push(String(params["id"]));
        return HttpResponse.json({});
      }),
    );
    const alerta = alertasMock[1];
    if (!alerta) throw new Error("falta la alerta del mock");
    const { result, unmount } = renderHook(() => useResolverConDeshacer(cliente), {
      wrapper: envoltorio,
    });

    act(() => {
      result.current.resolver(alerta);
    });
    expect(resueltas).toHaveLength(0);
    unmount();

    await waitFor(() => {
      expect(resueltas).toEqual([alerta.id]);
    });
  });
});
