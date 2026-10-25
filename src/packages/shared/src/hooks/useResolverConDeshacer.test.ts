// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor } from "../mocks";
import { alertasMock, manejadoresAlertas } from "../mocks/alertas";
import { useResolverConDeshacer } from "./useResolverConDeshacer";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
const envoltorio = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe("RF-076 enviarPendientes", () => {
  it("RF-076 envía ya lo que espera el plazo de gracia, una sola vez", async () => {
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
    act(() => {
      result.current.enviarPendientes();
    });
    await waitFor(() => {
      expect(resueltas).toEqual([alerta.id]);
    });
    unmount();
    await new Promise((r) => setTimeout(r, 50));

    expect(resueltas).toEqual([alerta.id]);
  });
});
