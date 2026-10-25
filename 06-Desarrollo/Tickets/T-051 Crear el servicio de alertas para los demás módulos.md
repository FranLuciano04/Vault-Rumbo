---
id: T-051
titulo: Crear el servicio de alertas para los demás módulos
modulo: M3 — Alertas
capa: backend
estado: hecho
depende_de: [T-007, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-073, RF-079, DEC-0013]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 14:20
rama: feature/T-051-crear-el-servicio-de-alertas-para-los-de
pr:
---
# T-051 Crear el servicio de alertas para los demás módulos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los demás módulos crean, resuelven y reabren alertas a través de un único servicio, y los estados de la alerta siguen EST-Alerta.

## Criterios de aceptación
- [x] `negocio/estados/alerta.py` aplica EST-Alerta (pendiente → vista → resuelta, posponer cambia la fecha); una transición inválida lanza `TransicionInvalida`.
- [x] `servicios/alertas.py` ofrece `crear(tipo, fecha, descripcion, propietario, origen)`, `resolver_de_origen(origen)` y `reabrir_de_origen(origen)`; respeta el `CHECK` de un solo origen.
- [x] Resolver completa `resuelta_en`; reabrir lo vacía.

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
- **Implementación (25/10/26):**
  - `negocio/estados/alerta.py`: las transiciones de EST-Alerta. Una transición inválida lanza `TransicionInvalida`. `posponer(alerta, nueva_fecha, hoy=None)` exige `nueva_fecha > max(alerta.fecha, hoy)`, donde `hoy` vale por defecto `core.fechas.hoy()`. Si no se cumple, lanza `DatosInvalidos` (422).
  - `negocio/servicios/alertas.py`: `crear`, `resolver_de_origen(sesion, origen, tipos=None, *, por_cancelacion=False)` y `reabrir_de_origen(sesion, origen, *, solo_por_cancelacion=False)`. Las operaciones son idempotentes y devuelven solo las alertas que cambiaron.
  - `datos/repositorios/alertas.py`: `listar_de_origen` bloquea las filas con `FOR UPDATE` y usa `populate_existing`. No filtra por visibilidad: solo lo usan otros servicios, nunca endpoints.
  - Un origen sin `id` se guarda primero con `flush`, y si sigue sin `id` da `ValueError`. Un tipo de origen que no está en el mapa da `TypeError`.
- **Supuestos:** `origen` es la entidad ORM (`OrigenAlerta`) y `propietario` es un `Usuario`. `reabrir_de_origen` sin la marca reabre todas las resueltas.
- **Review (opus), dos rondas.**
  - Primera ronda: 1 bloqueante, 4 importantes y 2 menores, todos arreglados.
    - Bloqueante: un origen sin `id` resolvía alertas de toda la empresa.
    - Importante: no se podía cumplir CU-27 (paso 4 y A3).
    - Importante: faltaba filtrar por tipo, para CU-05 y CU-08.
    - Importante: se podía posponer a una fecha pasada.
    - Importante: faltaba el bloqueo de filas.
  - Segunda ronda: 2 menores, arreglados.
  - Quedaron notas en T-053 (el endpoint tiene que bloquear la alerta) y en T-099 (cómo resolver y reabrir por cancelación).
- **Tests autorizados:** se agregaron tests y se ajustaron dos de posponer para que no dependan del reloj.
- **Modelos:** sonnet en tests, implementación y refactor; opus en la review. No hubo escalados.
