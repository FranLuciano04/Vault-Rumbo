---
tipo: entidad
estado: borrador
modulo: []
responsable:
pc: pc1
actualizado:
---
# <NombreEntidad>

<!-- Nombre exacto del lenguaje ubicuo, en español (Argentina). El mismo irá al código y a los diagramas. -->
tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
<Qué representa y de qué es responsable, en 1-2 líneas.>

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
|  |  |  |

## Métodos / comportamiento
- `metodo()` — <qué hace>

## Relaciones
- <cardinalidad> con [[OtraEntidad]] — <rol / significado>
  <!-- Ej: 1..* con [[Viaje]] — un Cliente tiene muchos Viajes -->

## Reglas / invariantes
- [[RN-01 Comisión automática]]

## Decisiones que la afectan
- [[DEC-####]]

## Aparece en
- CU: [[CU-01 De la consulta a la venta]]
- Diagramas: [[MOC — Modelo de dominio]] · [[DGM-ER]]

## 🔎 Revisión
> [!question] <Nombre> (dd/mm): <comentario>
