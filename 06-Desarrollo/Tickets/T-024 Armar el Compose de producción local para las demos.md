---
id: T-024
titulo: Armar el Compose de producción local para las demos
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: [T-001, T-002, T-008]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, DEC-0015]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-024 Armar el Compose de producción local para las demos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Con un comando se levanta Rumbo completo como en el servidor (nginx con la web, la API, PostgreSQL y el scheduler), y una variante para los e2e con el Auth Emulator y la IA falsa.

## Criterios de aceptación
- [ ] `docker compose -f src/docker-compose.yml up -d --build` sirve la web en `http://localhost` y la API en `/api`; la API corre las migraciones al arrancar.
- [ ] Un override de e2e suma el Auth Emulator y fija `IA_MODELO=falso`.
- [ ] Las imágenes no contienen secretos; todo sale del `.env`.

## Tests esperados
No sigue TDD (`infra`). Se verifica levantando el Compose y consultando `/api/salud` y la web.

## Contexto (leer solo esto)
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §7
- [[ARQ — Vista general]] — «Vista de despliegue»
- [[Spec de implementación]] §4 y §5

## Archivos probables
- `src/docker-compose.yml`
- `src/docker-compose.e2e.yml`
- `src/backend/Dockerfile`
- `src/apps/web/Dockerfile`
- `src/infra/nginx.conf`

## Fuera de alcance
- Cloudflare Tunnel y el servidor real (M10). El crontab del scheduler (M7).

## Notas de implementación
- **Del plan:** WeasyPrint necesita Pango en la imagen de la API: dejarlo instalado desde ahora.
