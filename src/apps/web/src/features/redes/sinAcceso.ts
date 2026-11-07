import { ErrorApi } from "@rumbo/shared";

/** La API rechazó la lectura por falta de acceso al módulo de redes (DEC-0008, DEC-0013). */
export const esSinAcceso = (falla: unknown) => falla instanceof ErrorApi && falla.status === 403;
