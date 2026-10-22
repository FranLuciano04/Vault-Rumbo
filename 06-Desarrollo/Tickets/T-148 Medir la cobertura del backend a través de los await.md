---
id: T-148
titulo: Medir la cobertura del backend a través de los await
modulo: M1 — Usuarios y configuración
capa: infra
estado: hecho
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-15, DEC-0001]
origen: hallazgo T-030
asignado: palomap2003
tomado_el: 22/10/26 20:12
rama: feature/T-148-medir-la-cobertura-del-backend-a-traves
pr:
---
# T-148 Medir la cobertura del backend a través de los await

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La cobertura del backend cuenta las líneas que se ejecutan después de un `await` en los servicios. Hoy aparecen como no ejecutadas aunque los tests pasan por ahí, porque coverage no sigue los greenlets de SQLAlchemy async.

## Criterios de aceptación
- [ ] `[tool.coverage.run]` de `src/backend/pyproject.toml` declara `concurrency = ["greenlet", "thread"]` (o lo que indique la documentación de coverage para SQLAlchemy async).
- [ ] Las líneas posteriores a un `await` de `negocio/servicios/configuracion.py` y `seguridad.py` figuran como cubiertas, y la cobertura total no baja.
- [ ] El job Backend del CI sigue en verde.

## Tests esperados
No sigue TDD: se verifica corriendo `uv run pytest --cov` antes y después y comparando el informe.

## Contexto (leer solo esto)
- [[DEC-0001 Stack tecnológico]] — umbrales de cobertura

## Archivos probables
- `src/backend/pyproject.toml`

## Fuera de alcance
- Cambiar tests o umbrales.

## Notas de implementación- **Adelantado en T-032 (PR [#39](https://github.com/FranLuciano04/Vault-Rumbo/pull/39), commit `483ff3b`), con la autorización de Paloma:** `concurrency = ["greenlet", "thread"]` en `[tool.coverage.run]`. Sin eso, `negocio/` daba 79,93 % con T-032 y el CI fallaba.
- **Verificación (22/10/26, sobre `main`):** `uv run pytest --cov=rumbo` da 678 pasan. `negocio/servicios/configuracion.py` da 98 %: la única línea sin cubrir, la 225, es el re-`raise` de un `IntegrityError` ajeno al nombre, no una línea después de un `await`. `seguridad.py` da 100 %. `negocio/` da 99 % y el backend 99 %; antes daban 79,93 % y 93 %. El job Backend del CI pasó en el PR #39.
- Sin código nuevo, así que no hubo implementación ni review: el diff de este ticket son solo estas notas. No se cambiaron tests ni umbrales.
