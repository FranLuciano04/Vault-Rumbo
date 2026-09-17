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
| rol | Enum | admin · empleado · dueño · **freelance** — `freelance` (vendedor externo, visibilidad restringida) según [[DEC-0008 Autenticación propia y rol de vendedor freelance]]. Ver [[DEC-0005 Autenticación y modelo de roles]] y [[Actores]] |

## Relaciones
- 1..* con [[Viaje]] — gestiona
- 1..* con [[ContenidoRed]] — si tiene acceso al módulo de redes

## Visibilidad
Autorización a nivel de fila (patrón *lectura global + propiedad*): `empleado` **lee todo** y filtra "lo suyo"; `admin` y `dueño` ven todo. El catálogo de [[Hotel|Hoteles]] y [[Reseña|Reseñas]] es compartido. Ver [[DEC-0005 Autenticación y modelo de roles]].
- **`freelance`:** excepción al patrón — ve y opera **solo lo suyo** (bloqueo de lectura fuera de sus clientes/operaciones); ve el catálogo compartido y crea clientes que quedan como suyos. Ratificado 17/09 — [[DEC-0008 Autenticación propia y rol de vendedor freelance]].

## Autenticación
Login con **usuario y contraseña individual** por persona; se audita **autor y fecha** (`created_by`/`updated_by`) de las acciones. Google OAuth opcional/futuro. Ratificado en la sync 17/09 — ver [[DEC-0008 Autenticación propia y rol de vendedor freelance]] y [[CU-24 Iniciar sesión]].

## Aparece en
- [[Actores]] · [[MOC — Modelo de dominio]]
