---
id: T-075
titulo: Publicar el contrato de hoteles y reseñas
modulo: M5 — Hoteles y reseñas
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, CU-17, CU-18, CU-29, RF-105, DEC-0003]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 09:02
rama: feature/T-075-publicar-el-contrato-de-hoteles-y-resena
pr:
---
# T-075 Publicar el contrato de hoteles y reseñas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de hoteles y reseñas, incluido el `PATCH /resenas/{id}` que pide RF-105 y que el contrato del PC1 no tenía.

## Criterios de aceptación
- [x] Las rutas del módulo `hoteles` con esquemas, roles (freelance solo consulta) y errores.
- [x] Se agrega `PATCH /resenas/{resena_id}` (editar reseña, RF-105) con los mismos roles que el alta.
- [x] Tipos, hooks y mocks MSW con un catálogo ficticio.

## Tests esperados
`tests/api/test_contrato_m5.py`: rutas, token, rol y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `hoteles`
- `05-Diseño/API/openapi.json` (PC1)
- [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]
- [[Hotel]]
- [[Reseña]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/hoteles.py`
- `src/backend/rumbo/presentacion/routers/hoteles.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/hoteles.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
- **Del plan:** Agregar `PATCH /resenas/{id}` es un cambio al contrato del PC1 que sale de RF-105: dejarlo anotado en la Bitácora técnica al cerrar el módulo.
- **Implementación (28/10/26):**
  - Hay 11 rutas stub en `routers/hoteles.py` con la guardia de rol real (`operacion(...)`). Las escrituras del catálogo y de las reseñas las hacen admin, dueño y empleado; la moderación, admin y dueño; las consultas, los cuatro roles. El freelance recibe 403 al escribir (DEC-0008).
  - Se agrega `PATCH /resenas/{id}` (RF-105), que no estaba en el PC1.
  - En `@rumbo/shared` hay tipos, hooks (`claveHoteles`) y mocks MSW (`manejadoresHotelesPara(rol)`) con 6 hoteles en 4 destinos y 6 reseñas.
- **Diferencias con el PC1:**
  - `Hotel` y `Resena` se definieron a partir de la entidad y de los CU, porque en el PC1 estaban como `SinDetallar`.
  - `Hotel` suma `puntaje_promedio` (de 1 a 5, con 2 decimales) y `cantidad_resenas`, ambos de solo lectura.
  - `GET /hoteles` lista por defecto solo los hoteles activos.
  - El listado de reseñas acepta el filtro `estado`. Las ocultas solo las ven admin y dueño (403 para el resto).
  - El 409 por duplicado devuelve el hotel existente (`ProblemaHotelDuplicado`), en el alta y en el `PATCH` (CU-16 A2).
  - Hay 409 en las transiciones inválidas: baja, ocultar, restaurar, y editar una reseña oculta.
- **Review (opus):** 0 bloqueantes, 5 importantes y 3 menores, todos arreglados.
  - Los importantes:
    - El helper `_stub` publicaba los roles pero no los exigía. El test se dividió en un caso de 403 y uno de 501, como en M1.
    - Faltaba el 409 de duplicado.
    - Faltaba el 403 de las reseñas ocultas.
    - Faltaban los 409 de las transiciones.
    - Las columnas NOT NULL de la tabla no coincidían con el CU. Queda anotado en T-076 como migración.
  - Notas para T-076, T-078 y T-079.
- **Modelos:** sonnet en tests e implementación; opus en la review. No hubo refactor aparte porque el diff es casi todo contrato y archivos generados.
