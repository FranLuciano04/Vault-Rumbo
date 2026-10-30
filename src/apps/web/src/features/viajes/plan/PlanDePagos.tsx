import type { Viaje } from "@rumbo/shared";
import type { AxiosInstance } from "axios";

/** Plan de pagos del viaje (CU-11, pantalla 15): editor con suma en vivo y acciones por pago. */
export function PlanDePagos(_props: {
  cliente: AxiosInstance;
  viaje: Viaje;
  editable: boolean;
}): never {
  throw new Error("no implementado");
}
