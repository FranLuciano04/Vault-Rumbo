---
id: T-062
titulo: Registrar una consulta como oportunidad
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
depende_de: [T-061, T-040]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, RF-004, RF-010, RF-011, RF-012, RF-013, DEC-0002]
origen: plan
asignado: palomap2003
tomado_el: 27/10/26 20:44
rama: feature/T-062-registrar-una-consulta-como-oportunidad
pr:
---
# T-062 Registrar una consulta como oportunidad

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra una consulta como oportunidad `nueva` de un cliente existente o de uno nuevo dado de alta en el mismo paso, con aviso si el cliente ya tiene una oportunidad abierta.

## Criterios de aceptación
- [ ] `POST /oportunidades` con cliente existente o alta rápida (A1, RF-004) en una sola transacción (RNF-05).
- [ ] Oportunidad abierta del mismo cliente → aviso con la existente y sin alta, salvo confirmación (A2).
- [ ] Datos mínimos faltantes (canal, cliente, interés) → 422 (A3).

## Tests esperados
`tests/api/test_oportunidades.py`: `test_rf010_registrar_consulta`, `test_rf004_alta_rapida_de_cliente`, `test_rf012_oportunidad_abierta_avisa`, `test_rf013_datos_minimos_422`.

## Contexto (leer solo esto)
- [[CU-04 Registrar consulta]]
- [[DEC-0002 Modelar la consulta como Oportunidad|DEC-0002]]
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Oportunidad]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/oportunidades.py`
- `src/backend/rumbo/datos/repositorios/oportunidades.py`
- `src/backend/rumbo/presentacion/routers/oportunidades.py`

## Fuera de alcance
- Consulta derivada del recontacto (M7).

## Notas de implementación
- **Desvío decidido por Paloma (27/10/26):** se sigue el contrato vigente y el flujo de la web (T-069). `POST /oportunidades` recibe solo `cliente_id`; el alta rápida (A1) es `POST /clientes` + `POST /oportunidades`, así que no es una sola transacción. El aviso de oportunidad abierta (A2) lo da el front con el listado filtrado (T-063): el servidor no responde 409 y crea igual la segunda. `test_rf012_oportunidad_abierta_avisa` fija ese listado, no código de este ticket.
- **DEC-0023** sigue en revisión: destino y pasajeros quedan obligatorios. Si se aprueba, el cambio va en un ticket nuevo.
- **Review (bloqueante, arreglado):** el cliente se validaba sin visibilidad y un freelance podía registrar una consulta sobre un cliente ajeno (DEC-0008, RN-10, DEC-0020). Ahora se lee con `visibilidad(actor)` y un cliente ajeno da el mismo 422 que uno inexistente. Se corrigió `test_rf010_todos_los_roles_registran_una_consulta` y se sumó `test_rf010_freelance_sobre_cliente_ajeno_422` (tests autorizados).
- **Checks:** `test_contrato_m4.py` esperaba el 501 de `POST /oportunidades`; se sumó a `IMPLEMENTADAS` y el test de fechas pasa a esperar 201 (tests autorizados, como en T-072).
- **Modelos:** tests, verde, refactor y fix con Sonnet; review con Opus (dos rondas). Sin escalados.
