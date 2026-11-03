---
id: T-115
titulo: Programar el proceso diario en el Compose
modulo: M7 — Proceso diario y CRM proactivo
capa: infra
estado: hecho
depende_de: [T-110, T-024]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, RNF-13]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 02/11/26 23:15
rama: feature/T-115-programar-el-proceso-diario-en-el-compos
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
- Cron con **supercronic** v0.2.51 (sin root, log a stdout, respeta `TZ`), agregado a la imagen `rumbo-backend` desde el release de GitHub con checksum sha256 fijado (amd64/arm64). El build del servidor necesita acceso a GitHub.
- `TZ=America/Argentina/Buenos_Aires` ya llegaba al scheduler por `*api-entorno`; no hizo falta tocarla.
- Verificado: `docker compose config`, `build api`, `supercronic -test` del crontab real, y un crontab de prueba `* * * * *` con dos corridas exitosas en `docker compose logs scheduler` (-03:00). Disparo manual con código 0.
- Review (Opus): aprobada, dos menores arreglados (`ARG TARGETARCH` global; aviso en el crontab de que una corrida perdida por caída a las 00:00 se dispara a mano). Queda como posible mejora para M10: recuperar corridas perdidas automáticamente.
- Modelos: impl sonnet, review opus. Sin escalados.
