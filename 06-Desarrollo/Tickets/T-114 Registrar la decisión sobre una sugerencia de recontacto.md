---
id: T-114
titulo: Registrar la decisión sobre una sugerencia de recontacto
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: libre
depende_de: [T-113, T-062, T-053]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-029, RF-030]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-114 Registrar la decisión sobre una sugerencia de recontacto

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Ante una sugerencia de recontacto, la persona la convierte en una consulta, marca al cliente para no recontactarlo o la pospone, y la sugerencia se resuelve.

## Criterios de aceptación
- [ ] Crear una oportunidad desde la sugerencia la resuelve (A2).
- [ ] Marcar `no_recontactar` resuelve la sugerencia (A1).
- [ ] Posponer mueve la fecha (A3).

## Tests esperados
`tests/api/test_recontacto.py`: `test_rf029_deriva_en_oportunidad`, `test_rf030_opt_out`, `test_posponer`.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]] — A1, A2 y A3
- [[Contrato de la API (OpenAPI)]] — rutas marcadas con CU-30

## Archivos probables
- `src/backend/rumbo/negocio/servicios/oportunidades.py`
- `src/backend/rumbo/negocio/servicios/clientes.py`

## Fuera de alcance
- —

## Notas de implementación
- **Del plan:** Usa endpoints existentes (`POST /oportunidades`, `PATCH /clientes/{id}`, `posponer`). Si hace falta vincular la oportunidad con la alerta y el contrato no lo permite, es un cambio de contrato: preguntar.
