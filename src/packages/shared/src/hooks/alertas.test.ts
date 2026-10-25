// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor } from "../mocks";
import { alertasMock, manejadoresAlertas, progresoMock } from "../mocks/alertas";
import {
  useAlerta,
  useAlertas,
  useCrearRecordatorio,
  usePosponerAlerta,
  useProgresoDelDia,
  useResolverAlerta,
} from "./alertas";

const servidor = crearServidor(...manejadoresAlertas);
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

describe("CU-14 hooks de alertas", () => {
  it("CU-14 useAlertas devuelve la agenda filtrada", async () => {
    const { result } = renderHook(() => useAlertas(cliente, { tipo: "pago" }), {
      wrapper: envoltorio,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.map((a) => a.tipo)).toEqual(["pago"]);
  });

  it("CU-14 useAlerta devuelve una alerta y no consulta sin id", async () => {
    const primera = alertasMock[0] as (typeof alertasMock)[number];
    const { result } = renderHook(() => useAlerta(cliente, primera.id), { wrapper: envoltorio });
    const sinId = renderHook(() => useAlerta(cliente, ""), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.data).toEqual(primera));
    expect(sinId.result.current.fetchStatus).toBe("idle");
  });

  it("CU-14 useProgresoDelDia devuelve las resueltas sobre el total", async () => {
    const { result } = renderHook(() => useProgresoDelDia(cliente), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.data).toEqual(progresoMock()));
  });

  it("CU-28 useCrearRecordatorio crea la alerta manual", async () => {
    const { result } = renderHook(() => useCrearRecordatorio(cliente), { wrapper: envoltorio });

    await act(() =>
      result.current.mutateAsync({ fecha: "2026-11-05", descripcion: "Llamar a Ana" }),
    );

    await waitFor(() =>
      expect(result.current.data).toMatchObject({ tipo: "manual", estado: "pendiente" }),
    );
  });

  it("CU-14 useResolverAlerta y usePosponerAlerta devuelven la alerta actualizada", async () => {
    const pendiente = alertasMock.find(
      (a) => a.tipo === "insistencia",
    ) as (typeof alertasMock)[number];
    const resolver = renderHook(() => useResolverAlerta(cliente), { wrapper: envoltorio });
    const posponer = renderHook(() => usePosponerAlerta(cliente), { wrapper: envoltorio });

    await act(() => resolver.result.current.mutateAsync(pendiente.id));
    await act(() => posponer.result.current.mutateAsync({ id: pendiente.id, fecha: "2026-12-01" }));

    await waitFor(() => expect(resolver.result.current.data).toMatchObject({ estado: "resuelta" }));
    await waitFor(() =>
      expect(posponer.result.current.data).toMatchObject({ fecha: "2026-12-01" }),
    );
  });
});
