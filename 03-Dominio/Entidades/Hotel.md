---
tipo: entidad
estado: borrador
modulo: [hoteles]
responsable:
pc: pc1
actualizado: 09/09/26
---
# Hotel

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Hotel vendido, con reseñas, para consultar y recomendar (catálogo).

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Nombre |
| destino | String | Ciudad / país |
| categoria | String | Estrellas / tipo |

## Relaciones
- *..1..* con [[Viaje]]
- 1..* con [[Reseña]]

## Aparece en
- [[CU-01 De la consulta a la venta]] (post-venta) · [[MOD-Catalogo-Hoteles]]
