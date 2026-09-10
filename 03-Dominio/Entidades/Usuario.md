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
| rol | Enum | admin · empleado · dueño — ver [[DEC-0005 Autenticación y modelo de roles]] y [[Actores]] |

## Relaciones
- 1..* con [[Viaje]] — gestiona
- 1..* con [[ContenidoRed]] — si tiene acceso al módulo de redes

## Visibilidad
Autorización a nivel de fila: el `empleado` ve solo lo que gestionó él; `admin` y `dueño` ven todo. El catálogo de [[Hotel|Hoteles]] y [[Reseña|Reseñas]] es compartido. Ver [[DEC-0005 Autenticación y modelo de roles]].

## Aparece en
- [[Actores]] · [[MOC — Modelo de dominio]]
