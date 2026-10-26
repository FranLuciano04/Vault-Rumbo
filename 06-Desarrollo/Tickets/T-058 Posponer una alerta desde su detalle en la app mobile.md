---
id: T-058
titulo: Posponer una alerta desde su detalle en la app mobile
modulo: M3 — Alertas
capa: mobile
estado: hecho
depende_de: [T-057]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-075, RF-077]
origen: plan
asignado: palomap2003
tomado_el: 25/10/26 22:51
rama: feature/T-058-posponer-una-alerta-desde-su-detalle-en
pr:
---
# T-058 Posponer una alerta desde su detalle en la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al tocar una alerta se ve su detalle con el contexto del origen y se la puede posponer eligiendo una fecha.

## Criterios de aceptación
- [ ] Detalle con el contexto y acceso a la ficha del cliente si corresponde.
- [ ] Posponer con selector de fecha (solo futuras).
- [ ] Volver a la agenda actualizada.

## Tests esperados
`describe('RF-075 detalle')`, `describe('RF-077 posponer mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 53, 54 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]] — A4

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
- **Modelos:** tests, verde, refactor y fix con sonnet; review con opus, en dos rondas porque la primera tuvo un bloqueante. No hubo escalados.
- **Rutas:** el detalle vive en el stack de la pestaña Agenda: `app/(pestanas)/agenda/{_layout,index,[id]}.tsx`, en `/agenda/<id>`. Se descartó la pestaña oculta (`href: null`), porque en expo-router 58 no es navegable: era el bloqueante de la review. «Volver» hace `back()` dentro del stack, o `replace("/agenda")` si el detalle se abrió por enlace.
- **Posponer:**
  - En lugar de un picker libre, ofrece las tres opciones rápidas de la pantalla 54: mañana, en 3 días y en una semana. Mobile no tiene una librería de calendario.
  - Las opciones se cuentan desde `max(alerta.fecha, hoy)`, y el botón se muestra solo si la alerta está `pendiente`. Es la misma regla del backend y de la web (T-055).
- **Contexto:** se muestra en pares etiqueta/valor (Viaje, Oportunidad, Cliente, Importe). Los arma `datosDeContexto` en `@rumbo/shared`, y `lineaDeContexto` de la agenda se arma desde ahí, sin cambiar su salida.
- **Review:**
  - Ronda 1: 1 bloqueante, 2 importantes y 1 menor.
  - Ronda 2: 1 menor, la duplicación del formato del pago.
  - Todos arreglados. Se autorizó cambiar el test para que use la estructura real de pestañas y para sumar 4 casos.
- **Fuera del ticket:** la pantalla 53 también tiene «Resolver» y «Marcar como vista» en el detalle, pero los criterios no los piden. En la agenda solo la descripción es tocable, no toda la fila.
