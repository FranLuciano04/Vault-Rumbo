---
tipo: caso-uso
estado: en-revision
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 17/09/26
---
# CU-10 Registrar economía del viaje

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Cargar la economía de un [[Viaje]] —precio de venta, costo del operador, moneda y comisión del vendedor—; el sistema **calcula automáticamente** la **ganancia** (`venta − costo`) y el **margen %**. Ver [[RN-01 Comisión automática]] y [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|admin]] — configura la comisión por defecto de cada vendedor ([[CU-13 Configurar porcentaje de comisión]]).

## Precondiciones
- Existe el [[Viaje]] (creado/`vendido` en [[CU-07 Confirmar reserva]]).
- Existe el catálogo de [[Operador|Operadores]] ([[DEC-0009 Operador-Proveedor como entidad de catálogo]]) y, si aplica, el `vendedor` con su comisión por defecto ([[CU-13 Configurar porcentaje de comisión]]).

## Flujo principal
1. El empleado abre el [[Viaje]] y entra a su control económico.
2. Elige la `moneda` de la operación (**ARS / USD**) y el [[Operador]] proveedor.
3. Carga el `precioVenta` y el `costo` (del operador), en esa `moneda`.
4. Indica el `vendedor` y su `comision_vendedor` (importe o %; toma el default del vendedor, editable — [[CU-13 Configurar porcentaje de comisión]]).
5. El sistema aplica la [[RN-01 Comisión automática]] y **calcula** la **ganancia** (`precioVenta − costo`) y el **margen %** (`ganancia / precioVenta`).
6. El empleado confirma y el sistema guarda la economía del [[Viaje]].

## Flujos alternativos
- **A1 — Comisión del vendedor override:** el empleado ajusta la `comision_vendedor` de este [[Viaje]] puntual, distinta al default del vendedor; el sistema la conserva para la liquidación ([[CU-13 Configurar porcentaje de comisión]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- **A2 — Venta sin vendedor:** el viaje puede no tener `vendedor` (venta directa de la agencia): la `comision_vendedor` queda en cero y solo se registran ganancia y margen.
- **A3 — Costo mayor que la venta:** `costo > precioVenta` → el sistema advierte **ganancia/margen negativos** pero permite guardar (dato de gestión).
- **A4 — Edición con plan de cuotas ya definido:** si se modifica el `precioVenta` cuando el [[Viaje]] ya tiene su plan de [[Pago|Pagos]] ([[CU-11 Definir plan de cuotas]]), el sistema **advierte** que el plan quedó descalzado y exige **rebalancear** los [[Pago|Pagos]] para volver a cumplir `Σ montos = precioVenta` antes de confirmar.

## Postcondiciones
- El [[Viaje]] queda con `moneda`, `precioVenta`, `costo`, `operador`, `vendedor` y `comision_vendedor` registrados; `ganancia` y `margen` calculados y disponibles para dashboard y reportes.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]

## Entidades del dominio involucradas
- [[Viaje]] · [[Usuario]] (vendedor) · [[Operador]] · [[Pago]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!success] Sync 17/09 — **modelo económico resuelto** por la agencia y ratificado: se **descarta** "comisión = venta × %"; el modelo es **ganancia = venta − costo**, **margen %** sobre venta y **comisión del vendedor** aparte (importe o %, % sobre ganancia, default por vendedor + override). Multimoneda ARS/USD. Ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]]) y la nueva entidad [[Operador]] ([[DEC-0009 Operador-Proveedor como entidad de catálogo]]). El flujo y los alternativos quedaron actualizados.
>
> [!note] Historia: Nahuel (10/09) confirmó "% por defecto + override por viaje"; Francisco (11/09) elevó la pregunta de negocio a la agencia y agregó A4 (rebalanceo con plan de cuotas ya definido → [[CU-11 Definir plan de cuotas]]), que se mantiene.
