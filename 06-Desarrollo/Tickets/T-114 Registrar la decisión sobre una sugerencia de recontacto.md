---
id: T-114
titulo: Registrar la decisión sobre una sugerencia de recontacto
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: hecho
depende_de: [T-113, T-062, T-053]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-029, RF-030]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 03/11/26 20:41
rama: feature/T-114-registrar-la-decision-sobre-una-sugerenc
pr:
---
# T-114 Registrar la decisión sobre una sugerencia de recontacto

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Ante una sugerencia de recontacto, la persona la convierte en una consulta, marca al cliente para no recontactarlo o la pospone, y la sugerencia se resuelve.

## Criterios de aceptación
- [ ] Crear una oportunidad desde la sugerencia la resuelve (A2).
- [ ] Marcar `no_recontactar` resuelve la sugerencia (A1).
- [ ] Posponer mueve la fecha (A3).

## Tests esperados
`tests/api/test_recontacto.py`: `test_rf029_deriva_en_oportunidad`, `test_rf030_opt_out`, `test_posponer`.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]] — A1, A2 y A3
- [[Contrato de la API (OpenAPI)]] — rutas marcadas con CU-30

## Archivos probables
- `src/backend/rumbo/negocio/servicios/oportunidades.py`
- `src/backend/rumbo/negocio/servicios/clientes.py`

## Fuera de alcance
- —

## Notas de implementación
- **Del plan:** Usa endpoints existentes (`POST /oportunidades`, `PATCH /clientes/{id}`, `posponer`). Si hace falta vincular la oportunidad con la alerta y el contrato no lo permite, es un cambio de contrato: preguntar.
- **Decisión:** el contrato no vincula la oportunidad con la alerta, así que crear una oportunidad para el cliente o marcarlo `no_recontactar` resuelve sus alertas `recontacto` sin resolver (`resolver_de_origen`, por `alerta.cliente_id`). No cambia el contrato. Volver a poner `no_recontactar` en `false` no reabre nada.
- **Desvío del alcance (DEC-0019, decidido por Nahuel):** la review encontró que web y mobile llamaban a `POST /alertas/{id}/resolver` después y ahora recibían 409. Se sacó esa llamada de `TarjetaRecontacto`, `RecontactoMobile` y `NuevaConsulta`, junto con `alerta_id` en la URL. `useEditarCliente` invalida `claveAlertas`. El opt-out en web ya no ofrece «Deshacer»: el foco va al título de la agenda y aparece un aviso. Se autorizó `--tocar-tests` para los tests del front y del rojo.
- **Review (opus):** ronda 1, 1 bloqueante, 1 importante y 2 menores; ronda 2, 2 menores. Todos arreglados.
- **Modelos:** tests, impl, refactor y fix sonnet; review opus. Sin escalados. El refactor no encontró cambios.
- **Checks:** `format:check` marca 13 archivos, ninguno de este ticket.
