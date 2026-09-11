---
tipo: caso-uso
estado: borrador
modulo: [viajes, hoteles]
responsable: Francisco
pc: pc1
actualizado: 10/09/26
---
# CU-09 Armar itinerario de hoteles

tags:: #tipo/caso-uso #estado/borrador #pc/pc1

## Descripción
Asociar uno o varios Hoteles al Viaje con sus tramos (check-in/out).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
-

## Flujo principal
1.
2.
3.

## Flujos alternativos
- **A1 —**

## Postcondiciones
-

## Reglas de negocio aplicadas
-

## Entidades del dominio involucradas
-

## Diagramas
- [[DGM — Casos de uso]]

## 🔎 Revisión
> [!note] Francisco (11/09): al especificar este CU (sigue en `borrador`), contemplar que cada hotel del itinerario puede llevar una **fecha de vencimiento de pago a proveedor** (`vencimiento_pago_proveedor` en `viaje_hotel`, ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]); el sistema genera una [[Alerta]] de tipo `pago` **un mes antes** (requisito del relevamiento: "cada hotel tiene una fecha de vencimiento").
> [!question]
