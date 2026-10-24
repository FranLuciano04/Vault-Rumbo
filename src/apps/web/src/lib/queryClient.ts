import { QueryClient } from "@tanstack/react-query";

export function crearQueryClient(): QueryClient {
  return new QueryClient();
}
