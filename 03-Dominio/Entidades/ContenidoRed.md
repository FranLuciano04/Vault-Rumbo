---
tipo: entidad
estado: borrador
modulo: [redes]
responsable:
pc: pc1
actualizado: 09/09/26
---
# ContenidoRed

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Pieza de contenido para redes sociales, gestionada en un **tablero kanban** con calendario. El sistema **propone y organiza**, no publica solo ([[Alcance y fuera de alcance]]).

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| titulo | String | Título / idea |
| canal | Enum | instagram · … |
| estadoKanban | Enum | idea · en producción · listo · publicado |
| fechaPublicacion | Date (dd/mm/aa) | Programada |

## Relaciones
- *..1 con [[Usuario]] (rol marketing)

## Aparece en
- [[MOD-Redes-Sociales]]
