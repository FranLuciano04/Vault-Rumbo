---
id: T-125
titulo: Mostrar el calendario de viajes en la web
modulo: M8 — Calendario, dashboard y reportes
capa: web
estado: hecho
depende_de: [T-119, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-23, RF-136, RF-137, RF-138, RF-139]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 04/11/26 15:13
rama: feature/T-125-mostrar-el-calendario-de-viajes-en-la-we
pr:
---
# T-125 Mostrar el calendario de viajes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El calendario muestra viajes, vencimientos y alertas por mes, semana o día, con filtros, y cada evento lleva a su gestión.

## Criterios de aceptación
- [ ] Vistas mes, semana y día.
- [ ] Filtros y estado vacío.
- [ ] Click en un evento navega a su ficha.

## Tests esperados
`describe('RF-137 navegación del calendario')`, `describe('RF-139 ir al detalle')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 20, 38 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-23 Ver calendario de viajes y vencimientos]]

## Archivos probables
- `src/apps/web/src/features/calendario/`

## Fuera de alcance
- —

## Notas de implementación
- **Del plan:** Si hace falta una librería de calendario que no está en la spec §3, preguntar antes.
- **DEC-0024 punto 8:** el calendario muestra también las alertas programadas, con el filtro por tipo viaje / vencimiento / alerta. El filtro por estado se hace en el cliente (punto 9).
- **Implementación:** sin librería de calendario; la aritmética de fechas está en `features/calendario/periodo.ts`. «Hoy» usa `hoyEnBuenosAires()`.
- **Destinos de RF-139:** viajes y vencimientos van a `/viajes/:viaje_id`, porque no hay ruta de pago. Las alertas van a `/agenda`, porque no hay ruta por alerta.
- **Desvíos del prototipo (pantallas 20 y 38):** enlaces directos en lugar del popover con «Ir al viaje»; select de Tipo de una sola opción en lugar de los chips «Mostrar»; celdas de meses vecinos vacías y sin número; sin etiquetas Salida/Regreso, porque el contrato trae un evento por viaje, que se repite en cada día de su rango.
- **Pendiente, fuera del ticket:** el filtro «lo mío» (`responsable_id`) y el aviso de freelance de la pantalla 38.
- **Tests:** se corrigió con autorización un test del rojo: el estado vacío en vista Día llega al 15/11, porque el viaje de la fixture termina el 14/11 y `hasta` es inclusivo.
- **Review:** dos rondas. 1 bloqueante, 3 importantes y 3 menores, todos arreglados. La mutación confirmó que los tests de carga demorada fallan sin el arreglo.
- **Modelos:** tests, implementación y refactor con sonnet; review con opus. Sin escalados.
