---
id: T-112
titulo: Sugerir el avance de los viajes en el proceso diario
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: hecho
depende_de: [T-110, T-096]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-08, RF-039]
origen: plan
asignado: palomap2003
tomado_el: 03/11/26 19:44
rama: feature/T-112-sugerir-el-avance-de-los-viajes-en-el-pr
pr:
---
# T-112 Sugerir el avance de los viajes en el proceso diario

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada noche, los viajes cuya fecha de salida o de regreso llegó generan una alerta `viaje` que sugiere pasarlos a en curso o finalizado; el cambio lo confirma una persona.

## Criterios de aceptación
- [ ] Alerta de sugerencia para los viajes que salen hoy (a en curso) o volvieron (a finalizado), al vendedor o responsable.
- [ ] No cambia el estado del viaje (A1: confirmación manual).
- [ ] Idempotente: una sola alerta por viaje y sugerencia.

## Tests esperados
`tests/negocio/test_jobs_viajes.py`: `test_rf039_sugiere_en_curso`, `test_rf039_sugiere_finalizado`, `test_no_cambia_estado`, `test_idempotente`.

## Contexto (leer solo esto)
- [[CU-08 Gestionar estado del viaje]] — A1
- [[EST-Viaje]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/proceso_diario.py`

## Fuera de alcance
- —

## Notas de implementación
- Paso «avance de viajes» (`viajes.sugerir_avances`), registrado en `proceso_diario.PASOS` después del recontacto. Hay dos sugerencias:
  - `confirmado` con `fecha_salida <= fecha` sugiere pasarlo a «en curso».
  - `en_curso` con `fecha_regreso <= fecha` sugiere pasarlo a «finalizado».
- Se usa `<=` y no solo «hoy» para que la sugerencia no se pierda si el proceso no corrió algún día. En la primera corrida, cada viaje viejo que nunca avanzó recibe una alerta.
- No cambia el estado (A1). Crea una alerta `viaje` para el responsable activo o, si no lo hay, para el primer admin activo, igual que el recontacto. Si no hay ningún admin activo, no crea la alerta y lo informa en el detalle y en un warning.
- Idempotencia: una alerta `viaje` pendiente o vista frena otra de la misma sugerencia. La sugerencia se reconoce por la marca «en curso» o «finalizado» en la descripción, sin columna nueva. Solo este paso crea alertas `viaje`. La constante `_SUGERENCIAS_DE_AVANCE` tiene un comentario: la marca tiene que seguir apareciendo en el texto.
- Fix de la review (importante): `iniciar`, `finalizar` y `corregir_estado` resuelven la sugerencia abierta con `resolver_de_origen`, así no queda una alerta desactualizada que tape la nueva. Se agregaron tests en `tests/api/test_viajes_estado.py` y en `test_jobs_viajes.py`, sin modificar los existentes (`--tocar-tests`).
- Refactor sin cambios. Modelos: tests con sonnet, implementación, refactor y fix con opus, review de seguridad con sonnet. No hubo escalados.
