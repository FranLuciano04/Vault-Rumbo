// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor, manejadorYo, usuariosPorRol } from "../mocks";
import { useYo } from "./useYo";

const servidor = crearServidor();
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function envoltorio({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient() }, children);
}

describe("RF-141 useYo", () => {
  it("RF-141 devuelve el usuario de la sesión", async () => {
    servidor.use(manejadorYo("freelance"));

    const { result } = renderHook(() => useYo(cliente), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(usuariosPorRol.freelance);
  });

  it("RF-141 ante un 401 no reintenta y expone el error", async () => {
    let pedidos = 0;
    servidor.use(
      http.get("*/api/auth/yo", () => {
        pedidos += 1;
        return HttpResponse.json(
          { title: "No autenticado", status: 401 },
          { status: 401, headers: { "content-type": "application/problem+json" } },
        );
      }),
    );

    const { result } = renderHook(() => useYo(cliente), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(pedidos).toBe(1);
    expect(result.current.error).toMatchObject({ status: 401 });
  });
});
