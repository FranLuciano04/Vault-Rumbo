---
tipo: entidad
estado: borrador
modulo: []
responsable:
pc: pc1
actualizado: 09/09/26
---
# Usuario

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Persona que **opera** el sistema. Un mismo Usuario puede tener varios roles (PyME). Ver [[Actores]].

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Nombre |
| email | String | Login |
| rol | Enum | asesor · admin · marketing |

## Relaciones
- 1..* con [[Viaje]] — gestiona
- 1..* con [[ContenidoRed]] — si rol marketing

## Aparece en
- [[Actores]] · [[MOC — Modelo de dominio]]
