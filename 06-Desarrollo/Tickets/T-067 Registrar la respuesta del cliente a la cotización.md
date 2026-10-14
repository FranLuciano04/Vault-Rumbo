---
id: T-067
titulo: Registrar la respuesta del cliente a la cotización
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: libre
depende_de: [T-066]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-06, RF-023, RF-025]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-067 Registrar la respuesta del cliente a la cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se marca una cotización como enviada y se registra si el cliente la aceptó o la rechazó, con el efecto que EST-Cotización y EST-Oportunidad definen.

## Criterios de aceptación
- [ ] `POST /cotizaciones/{id}/enviar|aceptar|rechazar` aplican EST-Cotización; las inválidas (p. ej., aceptar una vencida) → 409.
- [ ] Aceptar deja la oportunidad lista para confirmar la reserva (A2).
- [ ] Rechazar registra el motivo según CU-06 A3.

## Tests esperados
`tests/negocio/test_estados_cotizacion.py` y `tests/api/…`: `test_rf023_enviar`, `test_rf025_aceptar`, `test_rf025_rechazar`, `test_aceptar_vencida_409`.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — A2, A3 y A5
- [[EST-Cotización]]
- [[EST-Oportunidad]]

## Archivos probables
- `src/backend/rumbo/negocio/estados/cotizacion.py`
- `src/backend/rumbo/negocio/servicios/oportunidades.py`

## Fuera de alcance
- Confirmar la reserva (M6).

## Notas de implementación
