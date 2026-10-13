---
tipo: entidad
estado: formalizado
modulo: []
responsable:
pc: pc1
actualizado: 13/10/26
fecha_aprobacion: 29/09/26
---
# Usuario

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Persona que **opera** el sistema. Un mismo Usuario puede tener varios roles (PyME). Ver [[Actores]].

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Nombre |
| email | String | Login |
| rol | Enum | admin · empleado · dueño · **freelance** — `freelance` (vendedor externo, visibilidad restringida) según [[DEC-0008 Autenticación propia y rol de vendedor freelance]]. Ver [[DEC-0005 Autenticación y modelo de roles]] y [[Actores]] |
| activo | Bool | **Baja lógica** ([[CU-25 Gestionar usuarios y roles|CU-25]] A3): un usuario inactivo no inicia sesión y conserva su historial — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| firebase_uid | String | Identificador de la cuenta en **Firebase Authentication**, único. Lo asigna el alta de [[CU-25 Gestionar usuarios y roles|CU-25]]; con él la API reconoce al usuario de cada pedido — [[DEC-0016 Autenticación con Firebase|DEC-0016]] |
| acceso_redes | Bool | **Capacidad** de usar el módulo de redes ([[ContenidoRed]]), asignada por `admin`; `admin` y `dueño` la tienen por rol — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| comision_default_tipo / comision_default_valor | Enum `importe · porcentaje` + Decimal (opcionales) | **Comisión por defecto** del vendedor ([[CU-13 Configurar porcentaje de comisión|CU-13]]); el porcentaje es sobre la ganancia — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |

## Relaciones
- 1..* con [[Viaje]] — gestiona
- 1..* con [[ContenidoRed]] — si tiene acceso al módulo de redes

## Visibilidad
Autorización a nivel de fila (patrón *lectura global + propiedad*): `empleado` **lee todo** y filtra "lo suyo"; `admin` y `dueño` ven todo. El catálogo de [[Hotel|Hoteles]] y [[Reseña|Reseñas]] es compartido. Ver [[DEC-0005 Autenticación y modelo de roles]].
- **`freelance`:** excepción al patrón — ve y opera **solo lo suyo** (bloqueo de lectura fuera de sus clientes/operaciones); ve el catálogo compartido y crea clientes que quedan como suyos. Ratificado 17/09 — [[DEC-0008 Autenticación propia y rol de vendedor freelance]].

## Autenticación
Cuenta **individual** por persona en **Firebase Authentication** (email y contraseña, o Google), creada solo por un `admin` o la dueña; Rumbo no guarda contraseñas. El rol y los permisos viven en Rumbo. Se audita **autor y fecha** (`created_by`/`updated_by`) de las acciones. Ver [[DEC-0016 Autenticación con Firebase|DEC-0016]] (reemplaza el login propio de [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]] §1) y [[CU-24 Iniciar sesión]].

## Aparece en
- [[Actores]] · [[MOC — Modelo de dominio]]
