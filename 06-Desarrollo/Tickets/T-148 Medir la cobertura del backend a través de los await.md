---
id: T-148
titulo: Medir la cobertura del backend a través de los await
modulo: M1 — Usuarios y configuración
capa: infra
estado: tomado
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

## Notas de implementación