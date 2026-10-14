---
id: T-051
titulo: Crear el servicio de alertas para los demás módulos
modulo: M3 — Alertas
capa: backend
estado: libre
depende_de: [T-007, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-073, RF-079, DEC-0013]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-051 Crear el servicio de alertas para los demás módulos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los demás módulos crean, resuelven y reabren alertas a través de un único servicio, y los estados de la alerta siguen EST-Alerta.

## Criterios de aceptación
- [ ] `negocio/estados/alerta.py` aplica EST-Alerta (pendiente → vista → resuelta, posponer cambia la fecha); una transición inválida lanza `TransicionInvalida`.
- [ ] `servicios/alertas.py` ofrece `crear(tipo, fecha, descripcion, propietario, origen)`, `resolver_de_origen(origen)` y `reabrir_de_origen(origen)`; respeta el `CHECK` de un solo origen.
- [ ] Resolver completa `resuelta_en`; reabrir lo vacía.

## Tests esperados
`tests/negocio/test_alertas.py`: `test_rf073_tipos_de_alerta`, `test_rf079_resolver_por_origen`, reabrir, transiciones inválidas.

## Contexto (leer solo esto)
- [[EST-Alerta]]
- [[Alerta]]
- [[CU-14 Ver y atender alertas del día]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — campos de alerta
- [[ARQ — Vista general]] — «Módulos»

## Archivos probables
- `src/backend/rumbo/negocio/estados/alerta.py`
- `src/backend/rumbo/negocio/servicios/alertas.py`
- `src/backend/rumbo/datos/repositorios/alertas.py`

## Fuera de alcance
- Endpoints (tickets siguientes).

## Notas de implementación
