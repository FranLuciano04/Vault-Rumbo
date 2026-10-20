import { render, screen } from "@testing-library/react-native";
import Inicio from "../app/index";

test("la pantalla de inicio muestra el nombre de la app", async () => {
  await render(<Inicio />);
  expect(screen.getByText("Rumbo")).toBeTruthy();
});
