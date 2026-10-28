---
id: T-167
titulo: Registrar una consulta sin destino ni pasajeros
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
depende_de: [T-062, T-066]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, RF-013, DEC-0023]
origen: hallazgo T-069
asignado: palomap2003
tomado_el: 28/10/26 12:56
rama: feature/T-167-registrar-una-consulta-sin-destino-ni-pa
pr:
---
# T-167 Registrar una consulta sin destino ni pasajeros

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una consulta se puede registrar solo con cliente y canal, como dice CU-04 A3, y el destino y los pasajeros se completan más tarde. Para emitir una cotización, en cambio, la oportunidad tiene que tener los dos datos. Aplica [[DEC-0023 Datos mínimos de la consulta|DEC-0023]], aprobada el 28/10/26.

## Criterios de aceptación
- [ ] `destino_consultado` y `pasajeros` son opcionales en `OportunidadCrear` y en la edición. Si vienen, se validan como hasta ahora: destino de 1 a 200 caracteres y al menos 1 pasajero.
- [ ] Una migración hace que las dos columnas admitan nulos, con el `CHECK (pasajeros IS NULL OR pasajeros >= 1)`. Se regeneran `openapi.json` y los tipos de `@rumbo/shared`, y se actualizan los mocks.
- [ ] Si la oportunidad no tiene destino o pasajeros, `POST` de la cotización responde 409 y explica qué falta.

## Tests esperados
`test_rf013_consulta_solo_con_cliente_y_canal`, `test_rf013_destino_y_pasajeros_se_validan_si_vienen` y `test_cu04_cotizar_sin_destino_o_pasajeros_es_409`, más el ajuste de los tests de contrato de M4 que exigían esos campos.

## Contexto (leer solo esto)
- [[DEC-0023 Datos mínimos de la consulta|DEC-0023]]
- [[CU-04 Registrar consulta]], A3
- `src/backend/rumbo/presentacion/esquemas/oportunidades.py` y `src/backend/rumbo/datos/modelos/comercial.py`

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/oportunidades.py`
- `src/backend/rumbo/datos/modelos/comercial.py` y una migración nueva
- `src/backend/rumbo/negocio/servicios/` (cotizaciones)

## Fuera de alcance
- Las pantallas, que van en T-168.

## Notas de implementación
- **Backend:** migración `0007` (las dos columnas admiten nulos, con `CHECK (pasajeros IS NULL OR pasajeros >= 1)`). El downgrade rellena con `''` y `1` solo para poder volver a `NOT NULL`. `emitir` responde 409 con lo que falta, después de `exigir_abierta`. `OportunidadEditar` permite completar los campos pero no vaciarlos (`null` da 422), porque hacen falta para cotizar.
- **Fuera del ticket, necesario:** `OportunidadDeAlerta` y `OportunidadDelCliente` pasan a `destino_consultado: str | None`, porque si no daban 500 al serializar. `@rumbo/shared` exporta `DESTINO_A_DEFINIR`, que T-168 puede reutilizar, y lo usan las alertas.
- **Regresión de tipos (DEC-0019, con autorización de Paloma):** el front dejaba de compilar con `string | null`. Se arregló lo mínimo: `HistorialClienteMobile` muestra «Destino a definir» y el test de `PaginaOportunidades` usa `?? ""` (con `--tocar-tests`). El resto de las pantallas (`TarjetaOportunidad`, `DetalleOportunidad`, `CotizacionesOportunidad`, que muestran pasajeros sin manejar el nulo) queda para T-168.
- **Review (Opus):** sin bloqueantes ni importantes. Se arreglaron los 3 menores: la constante del texto, el comentario en `OportunidadEditar` y dos tests nuevos (completar después y cotizar, y PATCH con `null` da 422).
- **Modelos:** tests, implementación, refactor y fix con Sonnet, y review con Opus, sin escalado. El refactor no cambió nada.
- **Checks en la PC (toca código compartido):** la suite completa del backend da 2151 passed y cobertura del 97,5 % (99 % en `negocio/`). Web 553 y mobile 182 en verde, lint y tipos limpios.
