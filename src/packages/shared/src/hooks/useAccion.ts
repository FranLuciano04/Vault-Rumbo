import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

/** Mutación que, al salir bien, invalida las consultas cuya clave empieza con `clave` o con alguna
 * de `tambien`. */
export function useAccion<Variables, Resultado>(
  clave: QueryKey,
  accion: (variables: Variables) => Promise<Resultado>,
  tambien: readonly QueryKey[] = [],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: () =>
      Promise.all(
        [clave, ...tambien].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}
