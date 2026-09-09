---
tipo: entidad
estado: borrador
modulo: [hoteles, clientes]
responsable:
pc: pc1
actualizado: 09/09/26
---
# Reseña

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Opinión post-viaje que deja un [[Cliente]] sobre un [[Hotel]] (o el [[Viaje]]). Alimenta el catálogo y la recomendación.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| puntaje | Int (1-5) | Calificación |
| comentario | Texto | Opinión |
| fecha | Date (dd/mm/aa) | Cuándo |

## Relaciones
- *..1 con [[Cliente]]
- *..1 con [[Hotel]]  <!-- confirmar si también sobre Viaje — ver MOC — Modelo de dominio -->

## Aparece en
- [[CU-01 De la consulta a la venta]] (post-venta) · [[MOD-Catalogo-Hoteles]]
