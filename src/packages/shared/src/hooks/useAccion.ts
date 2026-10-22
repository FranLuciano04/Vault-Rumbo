import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

/** Mutación que, al salir bien, invalida las consultas cuya clave empieza con `clave`. */
export function useAccion<Variables, Resultado>(
  clave: QueryKey,
  accion: (variables: Variables) => Promise<Resultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clave }),
  });
}
