// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor } from "../mocks";
import { manejadoresOportunidades } from "../mocks/oportunidades";
import { useOportunidadesPorPaginas } from "./oportunidades";

const servidor = crearServidor(...manejadoresOportunidades);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function envoltorio({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  );
}

describe("RF-016 hooks de oportunidades", () => {
  it("RF-016 useOportunidadesPorPaginas suma la página siguiente hasta cubrir el total", async () => {
    const { result } = renderHook(
      () => useOportunidadesPorPaginas(cliente, { estado: "ganada", por_pagina: 1 }),
      { wrapper: envoltorio },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1]?.items[0]?.id).not.toBe(
      result.current.data?.pages[0]?.items[0]?.id,
    );
    expect(result.current.hasNextPage).toBe(false);
  });
});
