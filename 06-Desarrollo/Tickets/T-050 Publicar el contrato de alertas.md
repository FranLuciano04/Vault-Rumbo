---
id: T-050
titulo: Publicar el contrato de alertas
modulo: M3 — Alertas
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, CU-28]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 14:50
rama: feature/T-050-publicar-el-contrato-de-alertas
pr:
---
# T-050 Publicar el contrato de alertas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de alertas (agenda, detalle, recordatorio manual, vista, resolver, posponer y progreso del día), con tipos, hooks y mocks MSW.

## Criterios de aceptación
- [x] Las ocho rutas del módulo `alertas` con esquemas, filtros (hoy, próximas, responsable) y errores.
- [x] Todas responden `501`.
- [x] Tipos, hooks y mocks MSW con una agenda ficticia de cada tipo de alerta.

## Tests esperados
`tests/api/test_contrato_m3.py`: rutas, token y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `alertas`
- `05-Diseño/API/openapi.json` (PC1)
- [[Alerta]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/alertas.py`
- `src/backend/rumbo/presentacion/routers/alertas.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/alertas.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
- **Implementación (25/10/26):**
  - Las ocho rutas de `alertas` son stubs que responden 501. Admiten los cuatro roles, con 401 y 422 validados antes del 501. `/alertas/progreso-del-dia` está declarada antes que `/alertas/{alerta_id}`.
  - Se reutilizan los enums `TipoAlerta` y `EstadoAlerta` del modelo.
  - En `@rumbo/shared` hay tipos, 8 hooks, `esquemaRecordatorio` y mocks MSW: una alerta de cada tipo, otras 3 de un responsable distinto, y las guardas de EST-Alerta.
- **Decisiones:**
  - `Alerta` compone `Auditoria` con `allOf`, como en el PC1, mediante `componer_con_auditoria` (`esquemas/comunes.py`) y `_publicar_auditoria`. Es la convención para los esquemas nuevos. `Cliente` sigue aplanado.
  - La página de `GET /api/alertas` se declara inline a mano (`response_model=None`), como en el PC1.
  - Los `operation_id` van en snake_case, igual que en clientes.
  - `operacion(…, escritura=True)` agrega la regla de escritura a la descripción.
  - Se agregó el filtro `propietario_id`, que pedía el criterio de «responsable» y el PC1 no tenía.
- **Tests de shared:** el implementador agregó `hooks/alertas.test.ts` y `mocks/alertas.test.ts` en el verde. Como el verde no puede sumar tests sin autorización, quedaron afuera de ese commit y entraron en el fix, que los autoriza porque la review pidió tests de los mocks.
- **Review (opus):** 0 bloqueantes, 4 importantes y 3 menores.
  - Arreglados en el fix:
    - Mocks que permitían transiciones inválidas.
    - Mocks sin alertas ajenas.
    - Faltaba el filtro por responsable.
    - La regla de escritura no llegaba a la descripción.
    - Faltaba un test del validador de una sola entidad.
  - Pasados a T-052, que suma el listado: el contexto del origen y el responsable embebidos, y la validación de la página inline. Ver sus notas.
  - Aceptado: la convención `allOf`.
- **Modelos:** sonnet en tests, implementación y refactor (sin cambios); opus en la review. No hubo escalados.
