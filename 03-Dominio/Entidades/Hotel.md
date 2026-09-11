---
tipo: entidad
estado: borrador
modulo: [hoteles]
responsable:
pc: pc1
actualizado: 10/09/26
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
| precio_referencia | Decimal (ARS) | Precio de referencia por noche; permite filtrar por rango ([[CU-18 Buscar y recomendar hoteles]]) |
| servicios | Texto / lista | Servicios / amenities (wifi, pileta, desayuno…); filtrable ([[CU-18 Buscar y recomendar hoteles]]) |
| estado | Enum | `activo` · `cerrado` — soporta la baja de hoteles que cerraron conservando el historial ([[CU-16 Gestionar hotel en catálogo]]). _(A ratificar en la sync.)_ |

## Relaciones
- 0..* con [[Viaje]] (N:M vía `viaje_hotel`) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]
- 1 a 0..* con [[Reseña]] (un hotel puede tener muchas reseñas)

## Reglas / invariantes
- Baja: un `Hotel` sin viajes ni reseñas se elimina; con historial se marca `estado = cerrado` (no se borra, para no romper la trazabilidad de [[DEC-0003 Relación Viaje–Hotel y Reseña]]). _(A ratificar en la sync.)_

## Aparece en
- CU: [[CU-01 De la consulta a la venta]] (post-venta) · [[CU-16 Gestionar hotel en catálogo]] · [[CU-17 Registrar reseña de hotel]] · [[CU-18 Buscar y recomendar hoteles]]
- Diagramas: [[MOC — Modelo de dominio]] · [[DGM-ER]]
- Módulo: [[MOD-Catalogo-Hoteles]]
