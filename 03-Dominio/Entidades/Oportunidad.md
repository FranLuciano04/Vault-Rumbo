---
tipo: entidad
estado: formalizado
modulo: [clientes, cotizaciones]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# Oportunidad

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Representa una **consulta / lead**: el interés de un cliente en un viaje antes de convertirse en venta. Ordena el circuito de la consulta al cierre sin perder pasos.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| canal | Enum | instagram · whatsapp · presencial — canales de entrada de la consulta ([[CU-04 Registrar consulta]]) |
| destino | String | Destino consultado |
| fechas | Rango | Fechas tentativas |
| pasajeros | Int | Cantidad |
| estado | Enum | `nueva` (recibida, sin atender) · `en_gestión` (se está atendiendo/asesorando, antes de cotizar) · `cotizada` (cotización enviada) · `ganada` · `perdida` |
| motivo_perdida / motivo_perdida_detalle | Enum + Texto (opcionales) | Motivo al cerrar `perdida`, de una lista fija: `precio · fechas_disponibilidad · desistio · otra_agencia · sin_respuesta · otro`; el detalle es texto libre si es `otro` ([[CU-05 Seguir oportunidad|CU-05]] A2) — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| notas | Texto (opcional) | Notas de la consulta y del seguimiento: qué se habló y los próximos pasos ([[CU-04 Registrar consulta|CU-04]], [[CU-05 Seguir oportunidad|CU-05]]) — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| responsable | FK → [[Usuario]] | Empleado que registró/sigue la consulta; define la vista "mis oportunidades". Ver [[DEC-0005 Autenticación y modelo de roles]] |

## Relaciones
- *..1 con [[Cliente]] — pertenece a un Cliente
- *..1 con [[Usuario]] (`responsable`) — ver [[DEC-0005 Autenticación y modelo de roles]]
- 1..* con [[Cotización]] — genera cotizaciones
- 0..1 con [[Viaje]] — si se gana, deriva en un Viaje

## Reglas / invariantes
- **Visibilidad:** la `Oportunidad` es **legible por toda la agencia**; la gestión queda en su `responsable` y en `admin`/`dueño`. Ver [[DEC-0005 Autenticación y modelo de roles]].

## Decisiones que la afectan
- [[DEC-0002 Modelar la consulta como Oportunidad]]

## Aparece en
- CU: [[CU-01 De la consulta a la venta]]
- Diagramas: [[MOC — Modelo de dominio]]
- Módulo: [[MOD-Clientes]]
