---
tipo: decision
estado: en-revision
modulo: [M4]
decisores: []
fecha_aprobacion:
supersede:
actualizado: 27/10/26
---
# DEC-0023 Datos mínimos de la consulta

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> **Borrador, propuesto por Nahuel el 27/10/26 a partir de la review de T-069. Hace falta que el equipo lo apruebe.** Mientras no se apruebe, sigue vigente el contrato actual: destino y pasajeros son obligatorios.

## Contexto
- **Qué dice el análisis:** [[CU-04 Registrar consulta]] A3 (formalizado) y RF-013 ([[Requisitos funcionales]]) dicen que la [[Oportunidad]] se guarda en `nueva` «con lo mínimo (canal + cliente)» y que el resto se completa más tarde.
- **Qué dice el código:**
  - `OportunidadCrear` (`src/backend/rumbo/presentacion/esquemas/oportunidades.py`) exige `destino_consultado` (1 a 200 caracteres) y `pasajeros >= 1`.
  - El modelo (`src/backend/rumbo/datos/modelos/comercial.py`) los guarda como columnas no nulas, con `CHECK (pasajeros >= 1)`.
  - La web (T-069, PR #112) sigue al contrato: la pantalla de nueva consulta exige cliente, canal, destino y al menos un pasajero.
- **El problema:** una consulta que llega sin destino definido (por ejemplo, «quiero irme en julio, ¿qué me recomendás?») no se puede registrar, aunque el CU lo permite. Según el orden de autoridad de `CLAUDE.md`, el CU está por encima del código, pero la contradicción no se resuelve en silencio.
- **Momento:** T-062 (`POST /oportunidades` en el backend) todavía está libre. Si se cambia el contrato, conviene hacerlo antes o dentro de ese ticket.

## Decisión (propuesta)
Relajar el contrato para que coincida con CU-04 A3:
- `destino_consultado` y `pasajeros` pasan a ser **opcionales** al crear y al editar. Si vienen, se validan como hoy (destino de 1 a 200 caracteres, pasajeros ≥ 1).
- En la base de datos las dos columnas pasan a admitir nulos, con una migración. El `CHECK` queda como `pasajeros IS NULL OR pasajeros >= 1`.
- **Mínimo obligatorio:** cliente y canal, como dice el CU.
- **Pantallas que muestran el destino o los pasajeros** (tarjeta y detalle de la oportunidad, historial del cliente en la web y en mobile, aviso de oportunidad abierta) muestran «Destino a definir» o «—» cuando falten.
- **Pregunta abierta para el equipo:** ¿hace falta exigir destino y pasajeros antes de emitir una [[Cotización]] (T-066 ya está hecho)? La propuesta es que sí, con un 409 que explique qué falta, porque una cotización sin destino no tiene sentido. Si el equipo lo aprueba, se agrega como criterio en el ticket del backend.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| **Relajar el contrato (destino y pasajeros opcionales)** | Respeta el CU formalizado y el RF-013; deja registrar la consulta en el momento en que llega | Migración y ajustes en varias pantallas que hoy suponen que el dato existe | Propuesta |
| Ajustar CU-04 A3 y RF-013 a «canal + cliente + destino + pasajeros» | Sin cambios de código; el contrato ya funciona así | Cambia un CU formalizado sin un dato del relevamiento que lo respalde; obliga a inventar un destino cuando el cliente no lo tiene | |
| Valores de relleno («A definir», 1 pasajero) en la web | Sin migración | Guarda datos falsos: los reportes y el embudo cuentan un pasajero que nadie informó | |

## Consecuencias (si se aprueba)
- **Backend:** el cambio de contrato (esquemas, modelo, migración, `openapi.json` y tipos de `@rumbo/shared`) entra en T-062, o en un ticket nuevo de backend (`origen: hallazgo T-069`) si T-062 ya está tomado cuando se apruebe.
- **Web y mobile:** un ticket de front que haga opcionales los campos en `esquemaConsulta` (T-069) y muestre el faltante en la tarjeta, el detalle y el historial. Los tests de RF-013 de `NuevaConsulta.test.tsx` cambian: sin destino y sin pasajeros se registra igual.
- **Análisis:** CU-04 y RF-013 no cambian.
- Si se elige la segunda alternativa, se actualizan CU-04 A3 y RF-013 y no se toca el código.

## Referencias
- [[CU-04 Registrar consulta]] · RF-013 · [[Oportunidad]]
- [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0006 Destino como entidad de catálogo|DEC-0006]]
- Hallazgo de la review de T-069 (PR [#112](https://github.com/FranLuciano04/Vault-Rumbo/pull/112)) y sus «Notas de implementación».
