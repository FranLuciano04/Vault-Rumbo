---
id: T-052
titulo: Listar la agenda de alertas según el rol
modulo: M3 — Alertas
capa: backend
estado: hecho
depende_de: [T-050, T-051]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-075, RF-078, RF-154]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 15:27
rama: feature/T-052-listar-la-agenda-de-alertas-segun-el-rol
pr:
---
# T-052 Listar la agenda de alertas según el rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada persona ve su agenda del día y las próximas alertas; admin y dueña ven la de toda la agencia con el responsable. Cada alerta muestra el contexto de su origen.

## Criterios de aceptación
- [x] `GET /alertas` devuelve las vigentes del día (incluidas las atrasadas) o las próximas, del propietario; `admin`/`dueno` ven todas, con filtro por responsable (A1, A5).
- [x] `GET /alertas/{id}` incluye el contexto del origen (cliente, oportunidad, viaje o pago) (RF-075).
- [x] Agenda vacía → lista vacía (A3); alerta ajena para quien no es admin/dueña → 404.

## Tests esperados
`tests/api/test_alertas.py`: `test_rf074_agenda_del_dia`, `test_rf154_proximas`, `test_rf078_admin_ve_toda_la_agencia`, `test_rf075_contexto_del_origen`.

## Contexto (leer solo esto)
- [[CU-14 Ver y atender alertas del día]] — flujo principal, A1, A3 y A5
- Contrato: `src/packages/shared/openapi.json` (módulo `alertas`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Prototipo UI]] — pantallas 3, 49, 50 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/backend/rumbo/negocio/servicios/alertas.py`
- `src/backend/rumbo/presentacion/routers/alertas.py`

## Fuera de alcance
- Atender alertas (ticket siguiente).

## Notas de implementación
- **De la review de T-050 (25/10/26):**
  - **El contexto del origen y el responsable todavía no están en el contrato.** `Alerta` solo trae los ids. Este ticket los suma al contrato en la misma rama: por ejemplo, un `responsable` embebido (`id` y `nombre`) y un `contexto` del origen en el detalle y, si la agenda lo necesita (pantallas 3 y 49), también en el listado. Así la web no tiene que hacer un pedido por alerta. Se regeneran los tipos y se actualizan los mocks MSW.
  - **La página del listado es inline.** `GET /api/alertas` usa `response_model=None` para publicar la página inline del PC1. Por eso FastAPI no valida la respuesta. Hay que devolver un `Pagina[Alerta]` ya validado (construir el modelo Pydantic), no filas ORM sueltas.
  - **Filtro por responsable.** `propietario_id` quedó en el contrato desde T-050 y solo es para admin y dueño.
- **Implementación (25/10/26):**
  - `GET /api/alertas` y `GET /api/alertas/{id}` siguen las capas router → `servicios/alertas.py` (`listar_agenda` y `obtener_alerta`) → `RepositorioAlertas` (`paginar` y `contextos`).
  - Visibilidad: empleado y freelance ven solo lo propio, y una alerta ajena les da 404. Admin y dueña ven toda la agencia.
  - `propietario_id` filtra solo para admin y dueña; a los demás se les ignora.
- **Decisión: admin y dueña ven toda la agencia por defecto.** Así lo dicen CU-14 A1 y la pantalla 49 del prototipo, que tienen más autoridad que el texto que se había derivado del contrato del PC1 («por defecto, las propias»). Por eso se quitó el parámetro `todas`.
- **Filtros por defecto:**
  - solo `pendiente`, con `fecha <= hoy` (incluye las atrasadas);
  - `proximas`: `fecha > hoy`;
  - `hasta` es un tope dentro de esa ventana;
  - el orden es por fecha y después por id;
  - `hoy` se toma en hora de Argentina.
- **Contrato:** `Alerta` incluye `responsable` y `contexto` (cliente, oportunidad, viaje y pago con su moneda), tanto en el listado como en el detalle, en 7 consultas fijas.
  - El contexto aplica la visibilidad del actor: lo que no ve sale en `null`.
  - La página sigue inline y se devuelve como un `Pagina[Alerta]` validado.
- **Tests de T-050 ajustados en el commit `test(T-052)`:** en `test_contrato_m3.py`, las dos rutas ya no son stubs y se sacó `todas`. En `mocks/alertas.test.ts`, el filtro pasó a ser por `propietario_id`.
- **Review (opus), dos rondas:**
  - Primera ronda: 1 bloqueante, 3 importantes y 3 menores, todos arreglados.
    - El bloqueante: el contexto le mostraba al freelance cliente, viaje y pago ajenos.
    - Los importantes: faltaba la moneda del pago, los mocks no estaban alineados con la API y el router importaba de `datos`.
  - Segunda ronda: 2 menores (tests de visibilidad por rol), arreglados.
  - Quedó una nota en T-110 y T-113: las alertas automáticas no llevan en la descripción datos del origen.
- **Modelos:** sonnet en tests, implementación y refactor (sin cambios); opus en la review. No hubo escalados.
