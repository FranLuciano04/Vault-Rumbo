// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor } from "../mocks";
import { clientesMock, manejadoresClientes } from "../mocks/clientes";
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
    expect(result.current.data).toEqual(clientesMock[0]);
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
});
