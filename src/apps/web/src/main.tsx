import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { crearCliente } from "@rumbo/shared";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/estilos/index.css";

// El token de Firebase lo aporta el ticket del login; hasta entonces no hay sesión.
const cliente = crearCliente({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? "",
  obtenerToken: () => null,
});

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Falta el elemento #root en index.html");

createRoot(raiz).render(
  <StrictMode>
    <App cliente={cliente} />
  </StrictMode>,
);
