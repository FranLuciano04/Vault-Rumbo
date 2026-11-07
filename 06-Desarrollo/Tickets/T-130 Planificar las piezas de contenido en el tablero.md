---
id: T-130
titulo: Planificar las piezas de contenido en el tablero
modulo: M9 — Redes e IA
capa: backend
estado: hecho
depende_de: [T-129, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, RF-113, RF-114, RF-115, RF-116, RF-117, RF-118, RF-153, DEC-0013]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 06/11/26 19:32
rama: feature/T-130-planificar-las-piezas-de-contenido-en-el
pr:
---
# T-130 Planificar las piezas de contenido en el tablero

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Quien tiene acceso a redes crea piezas de contenido, las mueve por el kanban según EST-ContenidoRed, las reprograma y las descarta; Rumbo nunca publica en las redes.

## Criterios de aceptación
- [ ] Crear, ver, editar, reprogramar y mover piezas (`PATCH`) siguiendo EST-ContenidoRed, incluido retroceder una tarjeta (A5) y marcar publicada a mano (A3).
- [ ] Descartar es baja lógica (A4); el tablero y el calendario se consultan con `GET /contenidos`.
- [ ] Sin acceso a redes o `freelance` → 403; no existe ninguna integración de publicación (RF-118).

## Tests esperados
`tests/api/test_contenidos.py`: `test_rf113_crear`, `test_rf114_mover_por_el_kanban`, `test_rf115_reprogramar`, `test_rf116_calendario`, `test_rf117_descartar`, `test_sin_acceso_403`.

## Contexto (leer solo esto)
- [[CU-19 Planificar contenido en redes]]
- [[EST-ContenidoRed]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — acceso a redes
- Contrato: `src/packages/shared/openapi.json` (módulo `redes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/estados/contenido_red.py`
- `src/backend/rumbo/negocio/servicios/redes.py`
- `src/backend/rumbo/presentacion/routers/redes.py`

## Fuera de alcance
- Publicación automática (fuera de alcance).

## Notas de implementación
- **Estados:** `negocio/estados/contenido_red.py` aplica EST-ContenidoRed y las reglas que T-129 publicó en el mock: movimientos válidos, 409 sobre `publicado` y `descartado` (también con `{}`), y `descartado` solo por `/descartar`. Un pedido inválido no aplica ningún cambio.
- **Acceso:** se chequea en el router y en el servicio, con rol y capacidad. El freelance queda afuera aun con `acceso_redes`. `tiene_acceso_redes` no cambió, porque `/auth/yo` depende de su comportamiento.
- **Contrato:** `test_contrato_m9.py` dejó el 501 solo para `propuestas-ia` (es de T-131); ese cambio entró en el rojo.
- **Refactor:** sin cambios, no hubo nada que valiera la pena simplificar.
- **Fix:** tocó tests con `--tocar-tests`, autorizados por hallazgos de la review. Se sumó `tests/negocio/test_redes.py`.
- **Modelos usados:** tests e implementación con Sonnet, review con Opus (1 ronda, sin bloqueantes), sin escalados.
