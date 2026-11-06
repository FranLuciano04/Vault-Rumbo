---
id: T-129
titulo: Publicar el contrato de redes
modulo: M9 — Redes e IA
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, CU-20, DEC-0013]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 06/11/26 17:57
rama: feature/T-129-publicar-el-contrato-de-redes
pr:
---
# T-129 Publicar el contrato de redes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) del tablero de contenido y de las propuestas con IA, con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las rutas del módulo `redes` con esquemas, roles (con acceso a redes; nunca `freelance`) y errores (502 si falla la IA).
- [ ] Todas responden `501`.
- [ ] Tipos, hooks y mocks MSW con piezas ficticias en cada columna.

## Tests esperados
`tests/api/test_contrato_m9.py`: rutas, token, acceso a redes y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `redes`
- `05-Diseño/API/openapi.json` (PC1)
- [[ContenidoRed]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/redes.py`
- `src/backend/rumbo/presentacion/routers/redes.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/redes.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
- **Acceso:** dependencia `exigir_acceso_redes`, después de `exigir_roles`: freelance recibe 403 aun con la capacidad y el empleado necesita `acceso_redes` (DEC-0013).
- **`PATCH /contenidos/{id}`:** sigue EST-ContenidoRed: `idea↔en_produccion`, `en_produccion↔listo` y `listo→publicado`. El resto da 409, igual que cualquier cambio sobre `publicado` o `descartado`, y a `descartado` solo se llega por `/descartar`. Hoy lo aplica el mock; el backend lo hereda en T-130.
- **Listado:** sin filtro excluye `descartado`; con `estado_kanban=descartado` las muestra. El vault no lo dice textual: sale del «mismo criterio» de CU-19 A4. Lo aprobó Nahuel el 06/11/26.
- **Desvío del flujo:** el implementador agregó `mocks/redes.test.ts` en el verde, fuera del rojo, y `fase` lo frenó. Se apartó del commit del verde y entró en el fix con `--tocar-tests`, con el OK de Nahuel y ampliado con los casos de la review. Los cambios en `test_contrato_m9.py` también entraron así, autorizados por hallazgos de la review.
- **Menor pendiente para el ticket de backend:** `BorradorContenido.titulo` es obligatorio, pero el prompt de CU-20 (en borrador) no pide título. Hay que ajustar el prompt o derivarlo. Sin decisión del equipo todavía.
- **Modelos usados:** tests e implementación con Sonnet, review con Opus (2 rondas), sin escalados.
