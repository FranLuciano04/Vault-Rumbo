---
id: T-131
titulo: Generar borradores de contenido con IA
modulo: M9 — Redes e IA
capa: backend
estado: libre
depende_de: [T-130, T-013]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-20, RF-119, RF-120, RF-122, RNF-16, DEC-0012]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-131 Generar borradores de contenido con IA

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Quien tiene acceso a redes pide a la IA borradores de contenido a partir de un pedido acotado; el prompt está versionado en el repo y **nunca** incluye datos de clientes.

## Criterios de aceptación
- [ ] `POST /contenidos/propuestas-ia` arma el prompt de `negocio/prompts/contenido_red.py` (según IA — Prompt de CU-20) y devuelve borradores sin guardarlos (RF-119).
- [ ] El contexto que se envía se limita a lo que define RF-120: ningún dato de clientes ni de viajes concretos (RNF-16).
- [ ] Regenerar o descartar no persiste nada (A1, A2; RF-122); un error de la IA → 502 problem+json.

## Tests esperados
`tests/api/test_propuesta_ia.py` con el modelo falso: `test_rf119_devuelve_borradores`, `test_rf120_sin_datos_de_clientes` (inspecciona el prompt enviado), `test_rf122_no_persiste`, `test_error_ia_502`.

## Contexto (leer solo esto)
- [[CU-20 Generar propuesta de contenido con IA]]
- [[IA — Prompt de CU-20]]
- [[DEC-0012 Modelo de IA del producto|DEC-0012]]
- [[Spec de implementación]] §7 (Nunca)

## Archivos probables
- `src/backend/rumbo/negocio/prompts/contenido_red.py`
- `src/backend/rumbo/negocio/servicios/redes.py`

## Fuera de alcance
- Guardar el borrador (se hace con `POST /contenidos`, RF-121).

## Notas de implementación
