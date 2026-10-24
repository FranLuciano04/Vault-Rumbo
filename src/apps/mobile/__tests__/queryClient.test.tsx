import { Text } from "react-native";
import { ErrorApi } from "@rumbo/shared";
import { useQuery } from "@tanstack/react-query";
import { renderRouter } from "expo-router/testing-library";
import LayoutRaiz from "../app/_layout";

jest.mock("../global.css", () => ({}));

const consulta = jest.fn();

function Ficha() {
  const { isError, isPending } = useQuery({ queryKey: ["ficha"], queryFn: consulta });
  if (isError) return <Text>error mostrado</Text>;
  return <Text>{isPending ? "cargando" : "listo"}</Text>;
}

describe("RF-003 política de reintentos del QueryClient de la app mobile", () => {
  beforeEach(() => {
    consulta.mockReset();
  });

  it("no reintenta un ErrorApi 404: el error se muestra enseguida y la API se llama una sola vez", async () => {
    const e = new ErrorApi("HTTP 404");
    e.status = 404;
    consulta.mockRejectedValue(e);

    const vista = await renderRouter({ _layout: LayoutRaiz, index: Ficha });

    // findByText espera ~1 s; con reintentos el error recién aparece tras varios segundos
    expect(await vista.findByText("error mostrado")).toBeTruthy();
    expect(consulta).toHaveBeenCalledTimes(1);
  });
});
