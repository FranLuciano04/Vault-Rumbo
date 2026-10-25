---
id: T-052
titulo: Listar la agenda de alertas según el rol
modulo: M3 — Alertas
capa: backend
estado: libre
depende_de: [T-050, T-051]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-075, RF-078, RF-154]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-052 Listar la agenda de alertas según el rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada persona ve su agenda del día y las próximas alertas; admin y dueña ven la de toda la agencia con el responsable. Cada alerta muestra el contexto de su origen.

## Criterios de aceptación
- [ ] `GET /alertas` devuelve las vigentes del día (incluidas las atrasadas) o las próximas, del propietario; `admin`/`dueno` ven todas, con filtro por responsable (A1, A5).
- [ ] `GET /alertas/{id}` incluye el contexto del origen (cliente, oportunidad, viaje o pago) (RF-075).
- [ ] Agenda vacía → lista vacía (A3); alerta ajena para quien no es admin/dueña → 404.

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
