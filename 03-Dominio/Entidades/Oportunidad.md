---
tipo: entidad
estado: en-revision
modulo: [clientes, cotizaciones]
responsable: Nahuel
pc: pc1
actualizado: 09/09/26
---
# Oportunidad

tags:: #tipo/entidad #estado/en-revision #pc/pc1

## Responsabilidad
Representa una **consulta / lead**: el interés de un cliente en un viaje antes de convertirse en venta. Ordena el circuito de la consulta al cierre sin perder pasos.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| canal | Enum | instagram · whatsapp |
| destino | String | Destino consultado |
| fechas | Rango | Fechas tentativas |
| pasajeros | Int | Cantidad |
| estado | Enum | nueva · cotizada · ganada · perdida |

## Relaciones
- *..1 con [[Cliente]] — pertenece a un Cliente
- 1..* con [[Cotización]] — genera cotizaciones
- 0..1 con [[Viaje]] — si se gana, deriva en un Viaje

## Decisiones que la afectan
- [[DEC-0002 Modelar la consulta como Oportunidad]]

## Aparece en
- CU: [[CU-01 De la consulta a la venta]]
- Diagramas: [[MOC — Modelo de dominio]]
- Módulo: [[MOD-Clientes]]
