---
tipo: entidad
estado: formalizado
modulo: [hoteles]
responsable:
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# Hotel

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Hotel vendido, con reseñas, para consultar y recomendar (catálogo).

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Nombre |
| destino | FK → [[Destino]] | Ubicación del catálogo — ver [[DEC-0006 Destino como entidad de catálogo]] |
| categoria | String | Estrellas / tipo |
| precio_referencia | Decimal (ARS) | Precio de referencia por noche; permite filtrar por rango ([[CU-18 Buscar y recomendar hoteles]]) |
| servicios | Texto / lista | Servicios / amenities (wifi, pileta, desayuno…); filtrable ([[CU-18 Buscar y recomendar hoteles]]) |
| estado | Enum | `activo` · `cerrado` — soporta la baja de hoteles que cerraron conservando el historial ([[CU-16 Gestionar hotel en catálogo]]). |

## Relaciones
- *..1 con [[Destino]] — ver [[DEC-0006 Destino como entidad de catálogo]]
- 0..* con [[Viaje]] (N:M vía `viaje_hotel`, con **`id` propio** — no PK compuesta, porque el mismo hotel puede repetirse en dos tramos de un mismo viaje —, que lleva `check_in`/`check_out`, `orden` y **`vencimiento_pago_proveedor`** + `pago_proveedor_realizado`) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]
- 1 a 0..* con [[Reseña]] (un hotel puede tener muchas reseñas)

## Reglas / invariantes
- Baja (**definido** 11/09, sync): **siempre baja lógica** → `estado = cerrado`. Un `Hotel` **nunca se elimina físicamente** (se saca del catálogo activo pero se conserva, para no romper la trazabilidad de [[DEC-0003 Relación Viaje–Hotel y Reseña]] ni el historial del cliente).

## Aparece en
- CU: [[CU-01 De la consulta a la venta]] (post-venta) · [[CU-16 Gestionar hotel en catálogo]] · [[CU-17 Registrar reseña de hotel]] · [[CU-18 Buscar y recomendar hoteles]]
- Diagramas: [[MOC — Modelo de dominio]] · [[DGM-ER]]
- Módulo: [[MOD-Catalogo-Hoteles]]
