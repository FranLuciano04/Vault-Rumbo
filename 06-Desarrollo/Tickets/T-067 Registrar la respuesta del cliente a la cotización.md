---
id: T-067
titulo: Registrar la respuesta del cliente a la cotización
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
depende_de: [T-066]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-06, RF-023, RF-025]
origen: plan
asignado: palomap2003
tomado_el: 27/10/26 21:46
rama: feature/T-067-registrar-la-respuesta-del-cliente-a-la
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
- **Criterios aclarados con el vault:** aceptar deja la oportunidad `cotizada`; la cierra `ganada` CU-07 ([[EST-Oportunidad]] T4, sync 29/09), no T-067. Rechazar no registra motivo: CU-06 A3 y EST-Cotización T4 no lo tienen y el contrato no declara cuerpo. El motivo es el de perder la oportunidad (CU-05).
- **Decisiones del implementador, confirmadas por la review:** aceptar con la oportunidad cerrada responde 409 y rechazar no exige que esté abierta. Se bloquea primero la oportunidad y después la cotización, como en `emitir_cotizacion`.
- **Review de seguridad, sin bloqueantes:**
  - **Importante:** aceptar una `enviada` con `validez_hasta` vencida antes de que corriera el proceso diario. Paloma decidió que responda 409 (validez igual a hoy sigue aceptable), y se alineó EST-Cotización T3: guarda de validez y oportunidad `cotizada`.
  - **Menor:** se agregó un comentario sobre la doble lectura de la cotización.
- **Tests:** los de aceptar usan una validez relativa a hoy. `CotizacionFactory` fija `validez_hasta = 01/11/26` y los habría hecho fallar desde el 02/11; la factory no se tocó porque `test_cotizaciones.py` (T-066) depende de esa fecha. `test_contrato_m4.py` suma las tres rutas a `IMPLEMENTADAS` (autorizado).
- **Pendiente fuera de alcance:** `obtener_para_modificar` quedó repetido en los repositorios de oportunidades y cotizaciones (posible refactor a `RepositorioBase`).
- **Modelos:** tests con Sonnet; verde, refactor y fix con Opus; review de seguridad con Sonnet. Sin escalados.
