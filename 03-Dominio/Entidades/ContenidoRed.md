---
tipo: entidad
estado: formalizado
modulo: [redes]
responsable:
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# ContenidoRed

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Pieza de contenido para redes sociales, gestionada en un **tablero kanban** con calendario. El sistema **propone y organiza**, no publica solo ([[Alcance y fuera de alcance]]).

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| titulo | String | Título / idea |
| texto | Texto (opcional) | Cuerpo del posteo: se escribe a mano o se completa con el borrador elegido en [[CU-20 Generar propuesta de contenido con IA|CU-20]] — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| canal | Enum | instagram · tiktok · whatsapp_ventas |
| estadoKanban | Enum | idea · en producción · listo · publicado · **descartado** — `descartado` es la **baja lógica** de una pieza que no va más (se conserva, no se borra); no sale desde `publicado`. Sumado 21/09, ver [[EST-ContenidoRed]] |
| fechaPublicacion | Date (dd/mm/aa) | Programada |

## Relaciones
- *..1 con [[Usuario]] (empleado que la crea; la gestión no está restringida a un rol — ver [[CU-19 Planificar contenido en redes]] y [[DEC-0005 Autenticación y modelo de roles]])

## Aparece en
- CU: [[CU-19 Planificar contenido en redes]] · [[CU-20 Generar propuesta de contenido con IA]]
- Módulo: [[MOD-Redes-Sociales]]
