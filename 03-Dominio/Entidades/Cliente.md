---
tipo: entidad
estado: en-revision
modulo: [clientes]
responsable: Paloma
pc: pc1
actualizado: 09/09/26
---
# Cliente

tags:: #tipo/entidad #estado/en-revision #pc/pc1

## Responsabilidad
Persona (o grupo) que consulta y viaja con la agencia. Concentra ficha, preferencias, historial y segmentación. Es el **activo del negocio** (fidelización).

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Nombre y apellido / grupo |
| contacto | String | WhatsApp / Instagram / email |
| segmento | Enum | familia · amigos · individual |
| preferencias | Texto | Destinos, estilo de viaje, notas |
| asesor_asignado | FK → [[Usuario]] (opcional) | Responsable de referencia; habilita el filtro "mis clientes" sin restringir la visibilidad. Ver [[DEC-0005 Autenticación y modelo de roles]] |
| no_recontactar | Bool | Opt-out del CRM proactivo: si está activo, el cliente no se sugiere para recontacto. Ver [[CU-30 Sugerir recontacto de clientes]] |

## Relaciones
- 1..* con [[Oportunidad]] — un Cliente genera muchas consultas
- 1..* con [[Viaje]] — historial de viajes
- 1..* con [[Reseña]] — reseñas que deja
- *..0..1 con [[Usuario]] (`asesor_asignado`, opcional) — ver [[DEC-0005 Autenticación y modelo de roles]]

## Reglas / invariantes
- Un Cliente **no** es un [[Usuario]] (no opera el sistema). Ver [[Actores]].
- **Visibilidad:** el `Cliente` es **visible y editable para toda la agencia** (activo compartido); `asesor_asignado` solo marca responsabilidad y habilita la vista personal, no bloquea el acceso. Ver [[DEC-0005 Autenticación y modelo de roles]].

## Aparece en
- CU: [[CU-01 De la consulta a la venta]]
- Diagramas: [[MOC — Modelo de dominio]] · [[DGM-ER]]
- Módulo: [[MOD-Clientes]]
