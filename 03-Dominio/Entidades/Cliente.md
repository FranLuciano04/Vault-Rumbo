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

## Relaciones
- 1..* con [[Oportunidad]] — un Cliente genera muchas consultas
- 1..* con [[Viaje]] — historial de viajes
- 1..* con [[Reseña]] — reseñas que deja

## Reglas / invariantes
- Un Cliente **no** es un [[Usuario]] (no opera el sistema). Ver [[Actores]].

## Aparece en
- CU: [[CU-01 De la consulta a la venta]]
- Diagramas: [[MOC — Modelo de dominio]] · [[DGM-ER]]
- Módulo: [[MOD-Clientes]]
