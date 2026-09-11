---
tipo: caso-uso
estado: en-revision
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-10 Registrar economía del viaje

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Cargar el precio de venta y el costo neto de un [[Viaje]]; el sistema calcula la comisión automáticamente según el `%comisión` configurado y expone el margen como dato informativo.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|admin]] — define el `%comisión` de la empresa ([[CU-13 Configurar porcentaje de comisión]]).

## Precondiciones
- Existe el [[Viaje]] (confirmado en [[CU-07 Confirmar reserva]]).
- Hay un `%comisión` vigente ([[DEC-0004 Comisión configurable por porcentaje]]).

## Flujo principal
1. El empleado abre el [[Viaje]] y entra a su control económico.
2. Carga el `precioVenta` en ARS.
3. Carga el `costoNeto` en ARS.
4. El sistema aplica la [[RN-01 Comisión automática]]: `comisión = precioVenta × %comisión`, tomando por defecto el `%` de empresa ([[CU-13 Configurar porcentaje de comisión]]).
5. El sistema muestra el **margen** informativo `precioVenta − costoNeto` (no es la comisión).
6. El empleado confirma y el sistema guarda la economía del [[Viaje]].

## Flujos alternativos
- **A1 — Comisión propia del viaje (override):** el empleado fija un `%comisión` distinto al de empresa para este [[Viaje]] puntual; el sistema recalcula y conserva ese valor ([[CU-13 Configurar porcentaje de comisión]], [[DEC-0004 Comisión configurable por porcentaje]]).
- **A2 — `%comisión` sin configurar:** el sistema avisa y usa el valor por defecto o bloquea el cálculo hasta configurarlo ([[CU-13 Configurar porcentaje de comisión]]).
- **A3 — Costo mayor que la venta:** `costoNeto > precioVenta` → el sistema advierte margen negativo pero permite guardar (dato de gestión).
- **A4 — Edición con plan de cuotas ya definido:** si se modifica el `precioVenta` cuando el [[Viaje]] ya tiene su plan de [[Pago|Pagos]] ([[CU-11 Definir plan de cuotas]]), el sistema **advierte** que el plan quedó descalzado y exige **rebalancear** los [[Pago|Pagos]] para volver a cumplir `Σ montos = precioVenta` antes de confirmar.

## Postcondiciones
- El [[Viaje]] queda con `precioVenta`, `costoNeto` y `comisión` registrados; el margen disponible para reportes.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]

## Entidades del dominio involucradas
- [[Viaje]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Nahuel (10/09): comisión **por defecto de empresa + `%` propio por viaje** (A1), confirmado. Pendiente de sync: si con `%comisión` sin configurar (A2) se bloquea o se usa un default. Alineado con [[DEC-0004 Comisión configurable por porcentaje]] (ratificar).
>
> [!question] Pregunta de negocio (Francisco, 11/09 — **a validar con la agencia**): conviven dos "ganancias": `comisión = precioVenta × %` y `margen = precioVenta − costoNeto`. ¿Qué representa exactamente la **comisión** (¿del vendedor/empleado?, ¿la que paga el operador/mayorista?) y sobre qué base se calcula (`precioVenta` o `margen`)? Esto define [[RN-01 Comisión automática]] y [[DEC-0004 Comisión configurable por porcentaje]]. Francisco lo consulta con el cliente antes de cerrarlo.
>
> [!note] Francisco (11/09): Se agrega A4 (edición de `precioVenta` con plan de cuotas ya definido → rebalanceo obligatorio), para cerrar la interacción con [[CU-11 Definir plan de cuotas]].
