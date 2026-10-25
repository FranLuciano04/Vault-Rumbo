---
id: T-113
titulo: Detectar clientes inactivos para sugerir el recontacto
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: libre
depende_de: [T-110, T-042, T-029]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-30, RF-027, RF-028, RF-030]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-113 Detectar clientes inactivos para sugerir el recontacto

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada noche se detectan los clientes fieles sin actividad hace `recontacto_meses` y se genera una alerta `recontacto` para su asesor, salvo que el cliente no quiera ser recontactado.

## Criterios de aceptación
- [ ] Criterio de «cliente fiel inactivo» exactamente como lo define CU-30 / RF-027, con el parámetro `recontacto_meses`.
- [ ] Excluye a los clientes con `no_recontactar` (RF-030) y a los que ya tienen una sugerencia pendiente.
- [ ] Sin candidatos no crea nada (A4); idempotente.

## Tests esperados
`tests/negocio/test_jobs_recontacto.py`: `test_rf027_detecta_inactivo`, `test_rf028_alerta_al_asesor`, `test_rf030_excluye_opt_out`, `test_sin_candidatos`, `test_idempotente`.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — `recontacto_meses`

## Archivos probables
- `src/backend/rumbo/negocio/servicios/proceso_diario.py`
- `src/backend/rumbo/negocio/servicios/clientes.py`

## Fuera de alcance
- La decisión sobre la sugerencia (ticket siguiente).

## Notas de implementación
- **De la review de T-052 (25/10/26):** la `descripcion` de una alerta no pasa por el filtro de visibilidad. Si se reasigna un cliente o un viaje, el contexto deja de mostrarle esos datos al freelance, pero el texto le sigue llegando. Por eso las alertas que se generan solas no ponen en la `descripcion` datos del origen, como el nombre del cliente o un monto: esos datos ya van en `contexto`. También se puede hacer que, al reasignar, se muevan las alertas abiertas.
