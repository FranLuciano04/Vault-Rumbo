---
id: T-006
titulo: Configurar la sesión async de la base con su entorno
modulo: M0 — Fundaciones
capa: backend
estado: tomado
depende_de: [T-001, T-004]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, RNF-05]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 14/10/26 19:30
rama: feature/T-006-configurar-la-sesion-async-de-la-base-co
pr:
---
# T-006 Configurar la sesión async de la base con su entorno

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`core.config` lee la configuración del entorno y `core.db` da una sesión async de SQLAlchemy por pedido. Los tests corren contra la base de tests y cada uno dentro de una transacción que se revierte.

## Criterios de aceptación
- [ ] La app arranca leyendo `DATABASE_URL`; sin la variable falla con un mensaje claro.
- [ ] `tests/conftest.py` da una sesión por test que se revierte al terminar y un `AsyncClient` de httpx con la app.
- [ ] Un caso de uso usa una sola transacción (commit al final del pedido, rollback ante error).

## Tests esperados
`tests/test_db.py`: un test inserta y el siguiente verifica que no quedó nada; un error dentro del pedido revierte todo (RNF-05).

## Contexto (leer solo esto)
- [[ARQ — Vista general]] — «Capas» y «Estructura de carpetas»
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §1 y supuestos
- [[Spec de implementación]] §6

## Archivos probables
- `src/backend/rumbo/core/config.py`
- `src/backend/rumbo/core/db.py`
- `src/backend/tests/conftest.py`

## Fuera de alcance
- Modelos, migraciones y auditoría.

## Notas de implementación
