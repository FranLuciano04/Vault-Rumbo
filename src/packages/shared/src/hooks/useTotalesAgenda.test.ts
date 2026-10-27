// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor } from "../mocks";
import { alertasMock, HOY_MOCK } from "../mocks/alertas";
import { useTotalesAgenda, type FiltrosDeTotales } from "./useTotalesAgenda";

const servidor = crearServidor();
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

/** El servidor responde siempre el mismo `total` para cualquier consulta de la agenda. */
function servidorConTotal(total: number) {
  servidor.use(
    http.get("*/api/alertas", () =>
      HttpResponse.json({ items: [], total, pagina: 1, por_pagina: 1 }),
    ),
  );
}

const ANA = "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03";
const TOMAS = "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04";

// Atrasada, pendiente, de Ana, tipo «pago».
const base = alertasMock[0] as (typeof alertasMock)[number];
const resueltaDeAna = { ...base, propietario_id: ANA, tipo: "pago" as const, fecha: "2026-10-23" };

function totales(filtros: FiltrosDeTotales) {
  return renderHook(() => useTotalesAgenda(cliente, HOY_MOCK, filtros), { wrapper: envoltorio });
}

describe("RF-074 RF-078 RF-154 totales de la agenda con «Deshacer» en espera", () => {
  it("RF-154 no descuenta la resuelta de otro responsable: el total no queda negativo", async () => {
    servidorConTotal(0);
    const { result } = totales({
      responsable: TOMAS,
      tipo: "",
      conVistas: false,
      resueltas: [resueltaDeAna],
    });

    await waitFor(() => expect(result.current.atrasadas).toBeDefined());
    await waitFor(() => expect(result.current.todas).toBeDefined());
    expect(result.current.atrasadas).toBe(0);
    expect(result.current.todas).toBe(0);
  });

  it("RF-074 no descuenta la resuelta de otro tipo que el filtrado", async () => {
    servidorConTotal(0);
    const { result } = totales({
      responsable: "",
      tipo: "pago",
      conVistas: false,
      resueltas: [{ ...resueltaDeAna, tipo: "manual" }],
    });

    await waitFor(() => expect(result.current.atrasadas).toBeDefined());
    expect(result.current.atrasadas).toBe(0);
  });

  it("RF-078 descuenta la resuelta que cumple responsable, tipo, fecha y estado", async () => {
    servidorConTotal(1);
    const { result } = totales({
      responsable: ANA,
      tipo: "pago",
      conVistas: false,
      resueltas: [resueltaDeAna],
    });

    await waitFor(() => expect(result.current.atrasadas).toBeDefined());
    expect(result.current.atrasadas).toBe(0);
  });

  it("RF-078 sin filtro de responsable ni de tipo descuenta igual la resuelta en espera", async () => {
    servidorConTotal(1);
    const { result } = totales({
      responsable: "",
      tipo: "",
      conVistas: false,
      resueltas: [resueltaDeAna],
    });

    await waitFor(() => expect(result.current.atrasadas).toBeDefined());
    expect(result.current.atrasadas).toBe(0);
  });

  it("RF-154 con vistas y responsable activo descuenta la vista del mismo responsable y no la de otro", async () => {
    servidorConTotal(1);
    const { result } = totales({
      responsable: ANA,
      tipo: "",
      conVistas: true,
      resueltas: [
        { ...resueltaDeAna, estado: "vista" },
        { ...resueltaDeAna, id: "otra-alerta", propietario_id: TOMAS, estado: "vista" },
      ],
    });

    await waitFor(() => expect(result.current.atrasadas).toBeDefined());
    // Pendientes (1) + vistas (1) del servidor, menos la sola vista de Ana.
    expect(result.current.atrasadas).toBe(1);
  });
});
