---
id: T-122
titulo: Calcular los indicadores operativos del dashboard
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: hecho
depende_de: [T-121]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, RF-125, RF-126, RF-128]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 17:23
rama: feature/T-122-calcular-los-indicadores-operativos-del
pr:
---
# T-122 Calcular los indicadores operativos del dashboard

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El dashboard suma los indicadores operativos y de agenda y la analítica comercial, cada uno con el enlace a su detalle.

## Criterios de aceptación
- [x] Indicadores operativos y de agenda (RF-125).
- [x] Analítica comercial (RF-126).
- [x] Cada indicador trae el filtro para navegar a su detalle (RF-128).

## Tests esperados
`tests/api/test_dashboard.py`: `test_rf125_operativos`, `test_rf126_analitica`, `test_rf128_enlace_al_detalle`.

## Contexto (leer solo esto)
- [[CU-21 Ver dashboard y embudo]]
- Contrato: `src/packages/shared/openapi.json` (módulo `dashboard`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/dashboard.py`

## Fuera de alcance
- —

## Notas de implementación
- **Hallazgo de T-121 (review):** RF-124 también pide `ventas_mensuales` (comparación con meses anteriores), `pendiente_de_pagar` (a operadores) y `proximos_vencimientos`. Ningún ticket los tenía; quedan para este. Hoy `GET /api/dashboard` los devuelve vacíos o en cero.
- Conviene sumar índices en `pago.viaje_id` y `viaje.created_at`: el dashboard los recorre enteros.
- **DEC-0024 punto 7:** pasajeros por destino = suma de `Oportunidad.pasajeros` de las ventas del período; los viajes sin oportunidad no suman pasajeros.
- **Hallazgo de T-126 (review):** las pantallas 46 y 47 muestran «Tus viajes activos» (cantidad), pero el contrato no tiene ese contador. Hay que sumarlo al esquema `Dashboard`, y la web pasa a usarlo en lugar de «Viajes próximos».
- **Implementado:**
  - Contadores como foto de hoy: consultas, presupuestos abiertos, reservas confirmadas, viajes activos (campo nuevo) y alertas.
  - Agenda de 7 días: vencimientos, y viajes próximos con pasajeros.
  - Top 5 de destinos, con pasajeros (DEC-0024 §7).
  - Ranking por vendedor con su comisión. Fuera de la dirección, cada uno ve solo su fila.
  - Ticket promedio y ventas de los últimos 6 meses.
  - `pendiente_de_pagar` y `detalles`, con claves fijas y filtros válidos de cada listado.
- 15 consultas fijas, sin N+1.
- **Supuesto a confirmar con la agencia:** `pendiente_de_pagar` suma el costo completo de cada viaje no cancelado al que le queda algún tramo de hotel sin pagar al proveedor. T-098 no guarda el importe por tramo. Un viaje sin tramos no suma, y uno pagado en parte suma el 100 %. Para que sea exacto hace falta un importe por tramo o un pago al operador por viaje, y eso es otro ticket.
- **Limitaciones de los enlaces (menores, aceptadas en la segunda review):**
  - «Consultas pendientes» y «Viajes activos» llevan al listado completo, porque `estado` admite un solo valor y no existe un filtro `activo`.
  - Los viajes no se filtran por responsable para la dirección.
  - El contador de alertas usa la ventana de 7 días, pero la agenda por defecto muestra hasta hoy, así que el número y la lista pueden no coincidir.
  - El arreglo de fondo es sumar `estado` multivalor y `responsable_id` en `/viajes`.
- **Pendientes:**
  - Índices en `pago.viaje_id` y `viaje.created_at`.
  - Que la web (T-126) use `viajes_activos` y `detalles` en lugar de los enlaces fijos.
- Review de Opus en dos rondas.
  - Primera: 1 bloqueante (filtros de `detalles` inválidos), 2 importantes (ranking por alcance y el supuesto de `pendiente_de_pagar`) y 3 menores. Todos arreglados o anotados.
  - Segunda: aprobada, con 1 menor anotado.
  - Se autorizó reescribir los dos tests de RF-128 y sumar 5 casos.
- Sin refactor aparte, por la poca memoria de la PC. Modelos: tests sonnet, implementación sonnet, review opus.
