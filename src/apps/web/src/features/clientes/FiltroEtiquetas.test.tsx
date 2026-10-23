import { crearCliente } from "@rumbo/shared";
import { crearServidor } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import { FiltroEtiquetas } from "./FiltroEtiquetas";

const servidor = crearServidor();
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
const etiquetas = Array.from({ length: 21 }, (_, i) => `etiqueta ${String(i).padStart(2, "0")}`);

function renderFiltro(elegidas: string[] = []) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FiltroEtiquetas cliente={cliente} elegidas={elegidas} alCambiar={() => undefined} />
    </QueryClientProvider>,
  );
}

describe("RF-031 menú de etiquetas", () => {
  it("RF-031 con 20 elegidas deshabilita las que no están marcadas", async () => {
    servidor.use(http.get("*/api/clientes/etiquetas", () => HttpResponse.json(etiquetas)));
    renderFiltro(etiquetas.slice(0, 20));
    await userEvent.click(screen.getByRole("button", { name: /etiquetas/i }));

    expect(await screen.findByRole("checkbox", { name: etiquetas[20] })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: etiquetas[0] })).toBeEnabled();
  });

  it("RF-031 muestra «Cargando…» mientras llegan las etiquetas", async () => {
    servidor.use(
      http.get("*/api/clientes/etiquetas", async () => {
        await delay("infinite");
        return HttpResponse.json([]);
      }),
    );
    renderFiltro();
    await userEvent.click(screen.getByRole("button", { name: /etiquetas/i }));

    expect(await screen.findByText("Cargando…")).toBeInTheDocument();
    expect(screen.queryByText(/no hay etiquetas en uso/i)).not.toBeInTheDocument();
  });

  it("RF-031 muestra un error si no se pueden cargar las etiquetas", async () => {
    servidor.use(
      http.get("*/api/clientes/etiquetas", () => new HttpResponse(null, { status: 500 })),
    );
    renderFiltro();
    await userEvent.click(screen.getByRole("button", { name: /etiquetas/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar las etiquetas/i);
  });

  it("RF-031 Escape cierra el menú y devuelve el foco al botón", async () => {
    servidor.use(http.get("*/api/clientes/etiquetas", () => HttpResponse.json(["Brasil"])));
    renderFiltro();
    const boton = screen.getByRole("button", { name: /etiquetas/i });
    await userEvent.click(boton);
    await screen.findByRole("checkbox", { name: "Brasil" });
    expect(boton).toHaveAttribute("aria-controls", screen.getByRole("group").id);

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });

  it("RF-031 un clic afuera cierra el menú", async () => {
    servidor.use(http.get("*/api/clientes/etiquetas", () => HttpResponse.json(["Brasil"])));
    renderFiltro();
    await userEvent.click(screen.getByRole("button", { name: /etiquetas/i }));
    await screen.findByRole("checkbox", { name: "Brasil" });

    await userEvent.click(document.body);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
