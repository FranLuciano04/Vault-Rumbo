import { Text } from "react-native";
import { act } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import LayoutRaiz from "../app/_layout";

// Jest no transforma CSS (Metro/NativeWind lo procesa en la app): se stubbea la hoja global.
jest.mock("../global.css", () => ({}));

type Nodo = { type: string; props?: Record<string, unknown>; children?: unknown };

// Recolecta las configuraciones de header nativo (react-native-screens) del árbol renderizado.
function configsDeHeader(nodo: unknown, acc: Nodo[] = []): Nodo[] {
  if (Array.isArray(nodo)) nodo.forEach((n) => configsDeHeader(n, acc));
  else if (nodo && typeof nodo === "object") {
    const n = nodo as Nodo;
    if (n.type === "RNSScreenStackHeaderConfig") acc.push(n);
    configsDeHeader(n.children, acc);
  }
  return acc;
}

function Pantalla() {
  return <Text>contenido de la pantalla</Text>;
}

describe("Layout raíz (DEC-0015, RNF-15)", () => {
  it("renderiza la ruta inicial dentro del Stack", async () => {
    const vista = await renderRouter({ _layout: LayoutRaiz, index: Pantalla });
    expect(await vista.findByText("contenido de la pantalla")).toBeTruthy();
  });

  it("no muestra el header nativo del Stack (headerShown: false)", async () => {
    const vista = await renderRouter({ _layout: LayoutRaiz, index: Pantalla });
    await vista.findByText("contenido de la pantalla");
    const headers = configsDeHeader(vista.toJSON());
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.every((h) => h.props?.hidden === true)).toBe(true);
  });

  it("navega a otra pantalla registrada bajo el mismo layout, también sin header", async () => {
    const vista = await renderRouter({
      _layout: LayoutRaiz,
      index: Pantalla,
      otra: () => <Text>otra pantalla</Text>,
    });
    await vista.findByText("contenido de la pantalla");
    await act(async () => router.push("/otra"));
    expect(await vista.findByText("otra pantalla")).toBeTruthy();
    const headers = configsDeHeader(vista.toJSON());
    expect(headers.length).toBeGreaterThan(1);
    expect(headers.every((h) => h.props?.hidden === true)).toBe(true);
  });
});
