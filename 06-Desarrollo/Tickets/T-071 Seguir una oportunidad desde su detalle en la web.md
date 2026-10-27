---
id: T-071
titulo: Seguir una oportunidad desde su detalle en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: hecho
depende_de: [T-070]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-014, RF-015, RF-017, RF-019, RF-020]
origen: plan
asignado: palomap2003
tomado_el: 27/10/26 15:18
rama: feature/T-071-seguir-una-oportunidad-desde-su-detalle
pr:
---
# T-071 Seguir una oportunidad desde su detalle en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El detalle de la oportunidad muestra su historia y permite registrar interacciones, agendar insistencias y cambiar su estado (en gestión, perder con motivo, reactivar, ganar).

## Criterios de aceptación
- [ ] Línea de tiempo de interacciones e insistencias.
- [ ] Acciones de estado solo cuando EST-Oportunidad las admite; perder pide el motivo.
- [ ] Los 409 se explican en un aviso.

## Tests esperados
`describe('RF-014 interacciones')`, `describe('RF-017 perder')`, `describe('RF-020 reactivar')` con MSW.

## Contexto (leer solo esto)
- [[CU-05 Seguir oportunidad]]
- [[EST-Oportunidad]]
- [[Prototipo UI]] — sistema de diseño (no hay pantalla propia)

## Archivos probables
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- Cotizaciones (ticket propio).

## Notas de implementación
- **Decisiones de Paloma en la sesión:**
  - **Interacciones.** No hay entidad `Interacción`: cada una se agrega al final de `Oportunidad.notas` como una línea `dd/mm/aa — <nombre>: <texto>`. Las notas previas no se tocan.
    - Riesgo aceptado: si dos personas registran a la vez, una pisa a la otra (PATCH desde el cliente, PyME).
  - **Contrato ampliado.** `GET /alertas?oportunidad_id=` devuelve las alertas de esa oportunidad dentro de la visibilidad. Con ese filtro **no se aplica la ventana de hoy ni `proximas`**: así la línea de tiempo ve las insistencias a futuro.
- **RF del ticket:** según `Requisitos funcionales.md`, RF-014 son las interacciones, RF-015 las insistencias, RF-016 los estados, RF-017 perder o ganar y RF-020 reactivar.
  - **RF-019** (reagendar una insistencia vencida) **queda fuera**: hoy se pospone desde la agenda.
- **Review (Opus):**
  - Hallazgos: 1 bloqueante (las insistencias a futuro no se listaban), 2 importantes (las notas previas se reescribían, y ganar se hacía en un clic) y 3 menores (doble clic, acciones visibles para quien solo lee, y títulos sin `h2`).
  - Todos se arreglaron, y la segunda ronda quedó limpia.
- **Checks:** en la primera corrida de la suite de backend, 4 tests ajenos al ticket (clientes e Instagram) dieron error de setup por la carga de la máquina. Aislados pasan, y la segunda corrida dio 1787 sin errores.
- **Modelos:** tests, implementación (backend y web) y refactor con Sonnet; review con Opus. Sin escalados.
