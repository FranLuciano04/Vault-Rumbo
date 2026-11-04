import type { AxiosInstance } from "axios";
import { PaginaCalendario } from "@/features/calendario/PaginaCalendario";

export function SeccionCalendario({ cliente }: { cliente: AxiosInstance }) {
  return <PaginaCalendario cliente={cliente} />;
}
