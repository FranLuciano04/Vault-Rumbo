---
id: T-007
titulo: Mapear las entidades del ER con SQLAlchemy
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-006]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0013, DEC-0016, RNF-07]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 15/10/26 15:27
rama: feature/T-007-mapear-las-entidades-del-er-con-sqlalche
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
- Modelos en `rumbo/datos/modelos/`, en cinco módulos: `enums`, `base` (`Base`, `IdMixin`, `AuditoriaMixin`), `catalogos`, `comercial` y `posventa`. Se reexportan desde `__init__`. Hasta que haya migraciones, los tests crean el esquema con `Base.metadata.create_all` dentro de la transacción que se revierte.
- Desvío del SQL: `updated_at` lleva `onupdate=func.now()` porque no hay trigger; solo cubre los UPDATE que pasan por SQLAlchemy. `Base` usa `eager_defaults=True` para no disparar MissingGreenlet al leer `updated_at`, `ganancia` o `margen` después de un UPDATE async.
- Hallazgos de la review (Opus) arreglados: `eager_defaults`, tipado de las fábricas (`Factory[T]`) para que mypy pase sobre los tests, `configuracion.id` `SmallInteger`, `ganancia` nullable, `sort_order` de id y auditoría, `MutableList` en `etiquetas` e `items`, test de `ON DELETE SET NULL` y formato. El orquestador autorizó tocar los tests del rojo (`--tocar-tests`).
- Los tests se corren con `--basetemp` dentro del scratchpad: el sandbox no deja escribir en `%TEMP%\pytest-of-*`, y por eso fallaba `test_config.py` (problema del entorno, no del ticket).
- Modelos: tests con Sonnet; implementación y fix con Sonnet; refactor con Sonnet (sin cambios); review con Opus. No hubo escalado.
