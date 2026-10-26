---
id: T-061
titulo: Publicar el contrato de oportunidades y cotizaciones
modulo: M4 — Oportunidades y cotizaciones
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, CU-05, CU-06, DEC-0002]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 12:37
rama: feature/T-061-publicar-el-contrato-de-oportunidades-y
pr:
---
# T-061 Publicar el contrato de oportunidades y cotizaciones

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de oportunidades (embudo, consulta, seguimiento, acciones de estado e insistencias) y cotizaciones (versiones, documento, enviar, aceptar, rechazar), con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las 16 rutas del módulo `oportunidades` con esquemas, roles y errores (409 por estado).
- [ ] Importes como texto decimal y moneda `ARS`/`USD`; el documento como `application/pdf`.
- [ ] Tipos, hooks y mocks MSW con un embudo ficticio.

## Tests esperados
`tests/api/test_contrato_m4.py`: rutas, token y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `oportunidades`
- `05-Diseño/API/openapi.json` (PC1)
- [[Oportunidad]]
- [[Cotización]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/oportunidades.py`
- `src/backend/rumbo/presentacion/routers/oportunidades.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/oportunidades.ts`

## Fuera de alcance
- `confirmar-reserva` (contrato de M6).

## Notas de implementación
- **Modelos:** tests, verde, refactor y fix con sonnet; review con opus. No hubo escalados. El refactor no cambió nada.
- **Contrato:** las 16 rutas del PC1 coinciden (11 bajo `/oportunidades` y 5 bajo `/cotizaciones`, todas con tag `oportunidades`). `operacion_de_viaje` de `contrato.py` pasó a llamarse `operacion_de_registro` porque ahora sirve también a M4; es solo un renombre.
- **Desvíos del PC1, que la review aprobó:** `operationId` en `snake_case` (como M6); la insistencia devuelve la `Alerta` de M3; `max_length=200` en `destino_consultado` (sale de la base) y `minLength` en `concepto` y en la descripción de la insistencia.
- **Mocks:** embudo con una oportunidad en cada uno de los 5 estados. La «cotizada» de Joaquín Ramos (Europa) usa el mismo id que las alertas ficticias. `reactivar` lleva de `perdida` a `en_gestion` (EST-Oportunidad T8).
- **Hallazgos de la review:** 0 bloqueantes, 2 importantes y 4 menores. Se arreglaron los 2 importantes (`reactivar` iba a `nueva`; `useRegistrarConsulta` no invalidaba alertas y clientes, CU-30) y 2 menores (`ItemCotizacion` hereda de `Entrada` para recortar espacios; comentario de emitir). Se autorizó sumar al test el caso de un `concepto` de solo espacios.
- **Para el backend de M4:** el esquema no valida `fecha_hasta_tentativa >= fecha_desde_tentativa` (la base tiene el CHECK: hoy daría 500, no 422) ni que `motivo_perdida="otro"` traiga detalle. El servicio tiene que devolver 422 en los dos casos (el mock de `perder` ya lo hace).
- **Deuda de mocks (previa):** los ids de cliente no coinciden entre mocks de M2, M3, M4 y M6 (por ejemplo «Familia Sosa» y el historial de Camila).
- **Checks:** un test de la web falló una vez al correr en paralelo con la suite del backend y pasó en dos corridas posteriores (416/416).
