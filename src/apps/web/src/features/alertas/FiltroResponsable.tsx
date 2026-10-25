import { useAsesores } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";

/** Agenda de un responsable (CU-14 A1, pantallas 49 y 50): solo para admin y dueño. */
export function FiltroResponsable({
  cliente,
  valor,
  alCambiar,
}: {
  cliente: AxiosInstance;
  valor: string;
  alCambiar: (propietarioId: string) => void;
}) {
  const { data: asesores = [] } = useAsesores(cliente);
  return (
    <select
      aria-label="Responsable"
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      value={valor}
      onChange={(e) => {
        alCambiar(e.target.value);
      }}
    >
      <option value="">Responsable: todos</option>
      {asesores.map((asesor) => (
        <option key={asesor.id} value={asesor.id}>
          {asesor.nombre}
        </option>
      ))}
    </select>
  );
}
