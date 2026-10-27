import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Con la máquina cargada (varias suites o agentes a la vez), el primer render de una pantalla
// puede tardar más que el segundo por defecto de `waitFor`/`findBy*`, y el test falla al azar.
configure({ asyncUtilTimeout: 3000 });
