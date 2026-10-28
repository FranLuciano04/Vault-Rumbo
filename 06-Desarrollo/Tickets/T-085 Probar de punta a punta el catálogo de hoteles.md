---
id: T-085
titulo: Probar de punta a punta el catálogo de hoteles
modulo: M5 — Hoteles y reseñas
capa: e2e
estado: hecho
depende_de: [T-077, T-079, T-081, T-083, T-084, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, CU-17, CU-18, CU-29]
origen: plan
asignado: palomap2003
tomado_el: 28/10/26 18:59
rama: feature/T-085-probar-de-punta-a-punta-el-catalogo-de-h
pr:
---
# T-085 Probar de punta a punta el catálogo de hoteles

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El catálogo funciona contra el sistema real y la semilla de demo suma hoteles y reseñas ficticios.

## Criterios de aceptación
- [ ] Un empleado da de alta un hotel y registra una reseña; la búsqueda lo ordena por puntaje.
- [ ] La admin oculta la reseña y el promedio cambia; la restaura.
- [ ] El `freelance` no puede dar de alta hoteles.

## Tests esperados
`e2e/hoteles.spec.ts`: `RF-097 alta`, `RF-101 reseña`, `RF-109 orden`, `RF-111 ocultar`.

## Contexto (leer solo esto)
- [[CU-16 Gestionar hotel en catálogo]]
- [[CU-17 Registrar reseña de hotel]]
- [[CU-18 Buscar y recomendar hoteles]]
- [[CU-29 Eliminar reseña]]

## Archivos probables
- `src/apps/web/e2e/hoteles.spec.ts`
- `src/backend/rumbo/datos/semillas/hoteles.py`

## Fuera de alcance
- —

## Notas de implementación
- **E2e (`e2e/hoteles.spec.ts`, 6 tests contra el Compose real):**
  - RF-097: alta de un hotel por un empleado.
  - RF-099: un duplicado ofrece abrir el hotel existente. Es un extra que no pedía el ticket.
  - RF-101: reseña registrada y puntaje actualizado.
  - RF-109: orden por promedio. Alfa tiene 3 reseñas de 3 y Zeta una de 5, así se distingue el promedio de la suma.
  - RF-111: la admin oculta una reseña, el promedio pasa de 4,0 a 5,0 y, al restaurarla, vuelve a 4,0.
  - RF-151: el freelance solo consulta. `POST /hoteles` y `POST /hoteles/{id}/resenas` le responden 403.
  - Cada test crea sus propios datos con un sufijo único y no depende de la semilla.
- **El criterio 3** (el freelance no da de alta) quedó rotulado como RF-151, igual que en `clientes.spec.ts` y `oportunidades.spec.ts`.
- **Semilla de demo (`semillas/hoteles.py`):** 5 hoteles ficticios en Cancún, Bariloche y Nueva York, con reseñas tomadas de los clientes de la semilla y una oculta con motivo. Es idempotente por destino y nombre normalizado, y corre después de configuración y clientes. Tiene su test en `tests/negocio/test_semilla_hoteles.py`: registro y orden en `SEMILLAS`, contenido mínimo y que una segunda corrida no suma nada.
- **Sin bugs del sistema:** los e2e pasaron contra el sistema real desde la primera corrida, así que no hubo verde ni refactor.
- **Review (Opus):** sin bloqueantes.
  - El importante, que la semilla no tenía test, quedó arreglado.
  - Tres menores quedaron arreglados: promedio contra suma, los h2 leídos solo dentro de la lista y el 403 de la reseña del freelance.
  - **Menor sin arreglar:** los helpers de login (`ingresar`, `tokenDe` y `crearPersona`) se repiten en las seis specs de e2e. Ya venía de antes; convendría pasarlos a un `e2e/sesion.ts` compartido, en un ticket aparte.
  - mypy marcó los tipos de los datos de la semilla y se arregló con alias de tupla.
- **Modelos:** tests y fix con Sonnet, y review con Opus, sin escalado.
