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
Opinión post-viaje que deja un [[Cliente]] sobre un [[Hotel]]. Alimenta el catálogo y la recomendación. Ver [[DEC-0003 Relación Viaje–Hotel y Reseña]].

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| puntaje | Int (1-5) | Calificación |
| comentario | Texto | Opinión |
| fecha | Date (dd/mm/aa) | Cuándo |

## Relaciones
- *..1 con [[Cliente]] (quien viajó)
- *..1 con [[Hotel]] (objeto de la reseña)
- *..0..1 con [[Viaje]] (`viaje_id` opcional, para trazabilidad)

## Aparece en
- [[CU-01 De la consulta a la venta]] (post-venta) · [[MOD-Catalogo-Hoteles]]
