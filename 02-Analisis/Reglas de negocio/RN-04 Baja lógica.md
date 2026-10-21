---
tipo: regla
estado: borrador
modulo: [viajes, economia, configuracion, hoteles, redes, seguridad]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-04 Baja lógica

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Sube a regla el RF-153, que el vault aplicaba en ocho entidades sin tenerlo en un solo lugar (la sección de revisión de [[Requisitos funcionales]] sugería una RN propia). Falta la aprobación del equipo.

## Enunciado
Ninguna baja del sistema borra información. Dar de baja un registro es **cambiarle el estado**, y el registro se conserva con su historial y su trazabilidad.

## Cómo se da de baja cada entidad
| Entidad | Baja | Requisito |
|---|---|---|
| [[Viaje]] | estado `cancelado` | RF-048 |
| [[Pago]] | estado `anulado` | RF-050, RF-066 |
| [[Hotel]] | estado `cerrado` | RF-100 |
| [[Reseña]] | estado `oculta` | RF-111 |
| [[ContenidoRed]] | estado `descartado` | RF-117 |
| [[Destino]] | `activo = false` | RF-091 |
| [[Operador]] | `activo = false` | RF-095 |
| [[Usuario]] | `activo = false` | RF-148 |

## Excepción
La eliminación física es excepcional y solo procede si no rompe la integridad referencial (RF-153).

## Consecuencias
- Un registro dado de baja deja de ofrecerse en las altas nuevas, pero sigue apareciendo en el historial y en los reportes.
- Destinos, operadores y reseñas pueden reactivarse o restaurarse (RF-092, RF-096, RF-112), y una cancelación de viaje puede revertirse (RF-053).

## Aplica en
- [[CU-11 Definir plan de cuotas]] · [[CU-16 Gestionar hotel en catálogo]] · [[CU-19 Planificar contenido en redes]] · [[CU-25 Gestionar usuarios y roles]] · [[CU-26 Gestionar destinos]] · [[CU-27 Cancelar viaje]] · [[CU-29 Eliminar reseña]] · [[CU-31 Gestionar operadores]]

## Origen
RF-153 (transversal) de [[Requisitos funcionales]], con los RF de baja de cada módulo.
