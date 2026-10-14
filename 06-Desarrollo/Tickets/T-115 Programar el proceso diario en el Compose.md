---
id: T-115
titulo: Programar el proceso diario en el Compose
modulo: M7 — Proceso diario y CRM proactivo
capa: infra
estado: libre
depende_de: [T-110, T-024]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, RNF-13]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-115 Programar el proceso diario en el Compose

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El servicio `scheduler` del Compose corre el proceso diario todos los días a las 00:00 de Argentina y deja su log consultable.

## Criterios de aceptación
- [ ] Crontab en `src/infra/` con la zona horaria de Argentina.
- [ ] El log de cada corrida queda accesible con `docker compose logs scheduler`.
- [ ] Se puede disparar a mano con el mismo comando de la spec.

## Tests esperados
No sigue TDD (`infra`). Se verifica adelantando la hora del cron en una prueba local.

## Contexto (leer solo esto)
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]
- [[ARQ — Vista general]] — «Vista de despliegue»

## Archivos probables
- `src/infra/crontab`
- `src/docker-compose.yml`

## Fuera de alcance
- El respaldo (M10).

## Notas de implementación
