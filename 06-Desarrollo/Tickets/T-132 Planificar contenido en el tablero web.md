---
id: T-132
titulo: Planificar contenido en el tablero web
modulo: M9 — Redes e IA
capa: web
estado: hecho
depende_de: [T-129, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, RF-113, RF-114, RF-115, RF-116, RF-117]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 06/11/26 21:25
rama: feature/T-132-planificar-contenido-en-el-tablero-web
pr:
---
# T-132 Planificar contenido en el tablero web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El módulo Redes muestra el tablero kanban y el calendario de publicaciones; se crean, editan, mueven, reprograman y descartan piezas.

## Criterios de aceptación
- [ ] Kanban por estado con acciones para avanzar o retroceder.
- [ ] Calendario de publicaciones.
- [ ] Solo visible con acceso a redes.

## Tests esperados
`describe('RF-114 kanban')`, `describe('RF-116 calendario')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 26 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-19 Planificar contenido en redes]]

## Archivos probables
- `src/apps/web/src/features/redes/`

## Fuera de alcance
- —

## Notas de implementación
- **Tablero:** una consulta por columna con `estado_kanban`, `useInfiniteQuery` y «Ver más» (`useContenidosPorPaginas` en `@rumbo/shared`, mismo patrón que Oportunidades). Sin cambios de contrato.
- **Decisión de Nahuel (06/11/26):** la columna Publicado no filtra por fecha. Una ventana de 30 días hacía desaparecer del tablero las piezas programadas hace más tiempo. La API solo ordena de la fecha más vieja a la más nueva, así que las publicadas recientes quedan detrás de «Ver más». Mostrarlas primero necesita un parámetro `orden` en la API.
- **Agregado por la review (prototipo 26):** «Mostrar descartadas» en solo lectura, filtros por canal, estado en la tarjeta y leyenda al pie.
- **Fuera de este ticket:** «Propuesta con IA» (T-133); invocar la IA desde una pieza ya creada (CU-19 A1, RF-119: conviene dejarlo explícito en T-133); etiqueta «Borrador con IA» (no hay campo en `ContenidoRed`); avatar del autor (la API devuelve solo `usuario_id`); botón «+» de alta rápida en la columna Idea.
- **Menores que quedan:** un error del tablero sigue visible si después se guarda una pieza desde el formulario; se limpia con la siguiente acción del tablero que sale bien. Sin test: `isFetchNextPageError`, las etiquetas Publicada/Programada del calendario y su estado de carga.
- **Modelos:** tests y código con sonnet, review con opus (dos rondas). Sin escalados.
