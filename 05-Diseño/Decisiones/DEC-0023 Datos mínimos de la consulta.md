---
tipo: decision
estado: formalizado
modulo: [M4]
decisores: [Nahuel, Paloma, Francisco]
fecha_aprobacion: 28/10/26
supersede:
actualizado: 28/10/26
---
# DEC-0023 Datos mínimos de la consulta

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo el 28/10/26.** La propuso Nahuel el 27/10/26 a partir de la review de T-069. Paloma la aprobó el 27/10/26 y Francisco el 28/10/26. Como T-062 ya estaba hecho, el cambio va en T-167 (backend) y T-168 (web y mobile).

## Contexto
- **Qué dice el análisis:** [[CU-04 Registrar consulta]] A3 (formalizado) y RF-013 ([[Requisitos funcionales]]) dicen que la [[Oportunidad]] se guarda en `nueva` «con lo mínimo (canal + cliente)» y que el resto se completa más tarde.
- **Qué dice el código:**
  - `OportunidadCrear` (`src/backend/rumbo/presentacion/esquemas/oportunidades.py`) exige `destino_consultado` (1 a 200 caracteres) y `pasajeros >= 1`.
  - El modelo (`src/backend/rumbo/datos/modelos/comercial.py`) los guarda como columnas no nulas, con `CHECK (pasajeros >= 1)`.
  - La web (T-069, PR #112) sigue al contrato: la pantalla de nueva consulta exige cliente, canal, destino y al menos un pasajero.
- **El problema:** una consulta que llega sin destino definido (por ejemplo, «quiero irme en julio, ¿qué me recomendás?») no se puede registrar, aunque el CU lo permite. Según el orden de autoridad de `CLAUDE.md`, el CU está por encima del código, pero la contradicción no se resuelve en silencio.
- **Momento:** T-062 (`POST /oportunidades` en el backend) todavía está libre. Si se cambia el contrato, conviene hacerlo antes o dentro de ese ticket.

## Decisión
Relajar el contrato para que coincida con CU-04 A3:
- `destino_consultado` y `pasajeros` pasan a ser **opcionales** al crear y al editar. Si vienen, se validan como hoy (destino de 1 a 200 caracteres, pasajeros ≥ 1).
- En la base de datos las dos columnas pasan a admitir nulos, con una migración. El `CHECK` queda como `pasajeros IS NULL OR pasajeros >= 1`.
- **Mínimo obligatorio:** cliente y canal, como dice el CU.
- **Pantallas que muestran el destino o los pasajeros** (tarjeta y detalle de la oportunidad, historial del cliente en la web y en mobile, aviso de oportunidad abierta) muestran «Destino a definir» o «—» cuando falten.
- **Antes de emitir una [[Cotización]]** la oportunidad tiene que tener destino y pasajeros. Si falta alguno, `POST` de la cotización responde 409 y explica qué falta (respuesta de Nahuel del 27/10/26; T-066 ya está hecho, así que es un cambio sobre lo emitido hoy).

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| **Relajar el contrato (destino y pasajeros opcionales)** | Respeta el CU formalizado y el RF-013; deja registrar la consulta en el momento en que llega | Migración y ajustes en varias pantallas que hoy suponen que el dato existe | ✅ |
| Ajustar CU-04 A3 y RF-013 a «canal + cliente + destino + pasajeros» | Sin cambios de código; el contrato ya funciona así | Cambia un CU formalizado sin un dato del relevamiento que lo respalde; obliga a inventar un destino cuando el cliente no lo tiene | |
| Valores de relleno («A definir», 1 pasajero) en la web | Sin migración | Guarda datos falsos: los reportes y el embudo cuentan un pasajero que nadie informó | |

## Consecuencias (si se aprueba)
- **Backend:** el cambio de contrato (esquemas, modelo, migración, `openapi.json` y tipos de `@rumbo/shared`) entra en T-062, o en un ticket nuevo de backend (`origen: hallazgo T-069`) si T-062 ya está tomado cuando se apruebe. Ese mismo ticket suma el 409 al emitir una cotización sin destino o sin pasajeros, con su test.
- **Web y mobile:** un ticket de front que haga opcionales los campos en `esquemaConsulta` (T-069) y muestre el faltante en la tarjeta, el detalle y el historial. Los tests de RF-013 de `NuevaConsulta.test.tsx` cambian: sin destino y sin pasajeros se registra igual.
- **Análisis:** CU-04 y RF-013 no cambian.
- Si se elige la segunda alternativa, se actualizan CU-04 A3 y RF-013 y no se toca el código.

## Referencias
- [[CU-04 Registrar consulta]] · RF-013 · [[Oportunidad]]
- [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0006 Destino como entidad de catálogo|DEC-0006]]
- Hallazgo de la review de T-069 (PR [#112](https://github.com/FranLuciano04/Vault-Rumbo/pull/112)) y sus «Notas de implementación».
