---
id: T-007
titulo: Mapear las entidades del ER con SQLAlchemy
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: [T-006]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0013, DEC-0016, RNF-07]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-007 Mapear las entidades del ER con SQLAlchemy

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada tabla y enum de `rumbo.sql` tiene su modelo SQLAlchemy 2.0 en `datos/modelos/`, con las columnas de auditoría en un mixin, y cada entidad tiene su fábrica de factory-boy para los tests.

## Criterios de aceptación
- [ ] Hay un modelo por cada una de las 15 tablas y un enum Python por cada uno de los 20 tipos, con los mismos nombres, tipos, nulos, defaults, `CHECK` y claves de `rumbo.sql`.
- [ ] `tests/fabricas.py` tiene una fábrica por entidad que produce filas válidas.
- [ ] Importes en `Numeric` mapeados a `Decimal`; fechas `timestamptz` con zona.

## Tests esperados
`tests/test_modelos.py`: cada fábrica persiste una fila válida; los `CHECK` relevantes (comisión por defecto, un solo origen de alerta, `resuelta_en`) rechazan filas inválidas.

## Contexto (leer solo esto)
- `05-Diseño/Datos/rumbo.sql` (fuente exacta)
- [[DGM-ER]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]
- [[DEC-0016 Autenticación con Firebase|DEC-0016]] — `firebase_uid`

## Archivos probables
- `src/backend/rumbo/datos/modelos/`
- `src/backend/tests/fabricas.py`
- `src/backend/tests/test_modelos.py`

## Fuera de alcance
- Migraciones (ticket siguiente) y repositorios por módulo.

## Notas de implementación
