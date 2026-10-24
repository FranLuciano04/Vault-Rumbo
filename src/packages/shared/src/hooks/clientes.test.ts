// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente, type ClienteListado } from "../cliente";
import { crearServidor } from "../mocks";
import { aFicha, clientesMock, manejadoresClientes } from "../mocks/clientes";
import {
  useClientes,
  useCliente,
  useCrearCliente,
  useEditarCliente,
  useHistorialCliente,
} from "./clientes";

const servidor = crearServidor(...manejadoresClientes);
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

describe("RF-031 hooks de clientes", () => {
  it("RF-031 useClientes devuelve la página de clientes", async () => {
    const { result } = renderHook(() => useClientes(cliente), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(clientesMock);
    expect(result.current.data?.total).toBe(clientesMock.length);
  });

  it("RF-031 useClientes manda los filtros como query string", async () => {
    const { result } = renderHook(() => useClientes(cliente, { pagina: 1, por_pagina: 1 }), {
      wrapper: envoltorio,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("RF-031 useCliente devuelve la ficha", async () => {
    const id = String(clientesMock[0]?.["id"]);

    const { result } = renderHook(() => useCliente(cliente, id), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(aFicha(clientesMock[0] as ClienteListado));
  });

  it("RF-031 useCliente expone el 404 como ErrorApi", async () => {
    const { result } = renderHook(
      () => useCliente(cliente, "00000000-0000-4000-8000-000000000000"),
      { wrapper: envoltorio },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });

  it("RF-031 useHistorialCliente devuelve el historial", async () => {
    const id = String(clientesMock[0]?.["id"]);

    const { result } = renderHook(() => useHistorialCliente(cliente, id), {
      wrapper: envoltorio,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty("oportunidades");
  });

  it("RF-031 useCrearCliente crea el cliente", async () => {
    const { result } = renderHook(() => useCrearCliente(cliente), { wrapper: envoltorio });

    await act(async () => {
      await result.current.mutateAsync({
        nombre: "Nuevo Cliente",
        contacto: "nuevo@mail.test",
        segmento: "individual",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ nombre: "Nuevo Cliente" });
  });

  it("RF-031 useCrearCliente expone el 409 de posible duplicado (CU-02 A1)", async () => {
    const { result } = renderHook(() => useCrearCliente(cliente), { wrapper: envoltorio });

    await act(async () => {
      await result.current
        .mutateAsync({
          nombre: "Otra Persona",
          contacto: String(clientesMock[0]?.["contacto"]),
          segmento: "individual",
        })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 409 });
    expect(result.current.error).toHaveProperty("duplicados", [
      aFicha(clientesMock[0] as ClienteListado),
    ]);
  });

  it("RF-031 useEditarCliente edita la ficha", async () => {
    const { result } = renderHook(() => useEditarCliente(cliente), { wrapper: envoltorio });

    await act(async () => {
      await result.current.mutateAsync({
        id: String(clientesMock[0]?.["id"]),
        cambios: { no_recontactar: true },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ no_recontactar: true });
  });

  it("RF-007 useEditarCliente deja en caché la ficha devuelta por el servidor", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const id = String(clientesMock[0]?.["id"]);
    const devuelta = {
      ...aFicha(clientesMock[0] as ClienteListado),
      nombre: "Nombre del servidor",
    };
    servidor.use(http.patch("*/api/clientes/:id", () => HttpResponse.json(devuelta)));
    const { result } = renderHook(() => useEditarCliente(cliente), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id, cambios: { nombre: "Lo que se mandó" } });
    });

    expect(queryClient.getQueryData(["clientes", id])).toEqual(devuelta);
  });

  it("RF-007 useEditarCliente invalida la consulta del listado para que se vuelva a pedir", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    let pedidosDelListado = 0;
    servidor.use(
      http.get("*/api/clientes", () => {
        pedidosDelListado += 1;
        return HttpResponse.json({
          items: clientesMock,
          total: clientesMock.length,
          pagina: 1,
          por_pagina: 20,
        });
      }),
    );
    const { result } = renderHook(
      () => ({ lista: useClientes(cliente), editar: useEditarCliente(cliente) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true));
    expect(pedidosDelListado).toBe(1);

    await act(async () => {
      await result.current.editar.mutateAsync({
        id: String(clientesMock[0]?.["id"]),
        cambios: { no_recontactar: true },
      });
    });

    await waitFor(() => expect(pedidosDelListado).toBe(2));
  });

  it("RF-031 useClientes manda el filtro segmento", async () => {
    const { result } = renderHook(() => useClientes(cliente, { segmento: "familia" }), {
      wrapper: envoltorio,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.map((c) => c.segmento)).toEqual(["familia"]);
  });

  it("RF-031 useCliente no consulta mientras no hay id", () => {
    const { result } = renderHook(() => useCliente(cliente, ""), { wrapper: envoltorio });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("RF-031 useHistorialCliente no consulta mientras no hay id", () => {
    const { result } = renderHook(() => useHistorialCliente(cliente, ""), {
      wrapper: envoltorio,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
