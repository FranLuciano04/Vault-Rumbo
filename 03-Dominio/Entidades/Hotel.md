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
- 0..* con [[Viaje]] (N:M vía `viaje_hotel`) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]
- 1 a 0..* con [[Reseña]] (un hotel puede tener muchas reseñas)

## Aparece en
- [[CU-01 De la consulta a la venta]] (post-venta) · [[MOD-Catalogo-Hoteles]]
