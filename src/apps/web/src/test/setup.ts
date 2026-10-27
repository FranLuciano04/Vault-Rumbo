import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Los findBy y waitFor esperan 1 s por defecto: con la suite completa en paralelo, la máquina se
// satura y fallaban casos distintos en cada corrida, aunque solos pasaran.
configure({ asyncUtilTimeout: 5_000 });
