---
id: T-024
titulo: Armar el Compose de producción local para las demos
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: [T-001, T-002, T-008]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, DEC-0015]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 19/10/26 21:33
rama: feature/T-024-armar-el-compose-de-produccion-local-par
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
- Hecho: Pango y fuentes en la imagen `rumbo-backend` (la comparten `api` y `scheduler`). La API corre `alembic upgrade head` antes de uvicorn, con `--proxy-headers`. nginx usa `absolute_redirect off`. `TZ=America/Argentina/Buenos_Aires` en api y scheduler (DEC-0011).
- El `scheduler` corre `sleep infinity`: el crontab y `jobs.diario` son de M7.
- El emulador usa su propio `infra/auth-emulator/firebase.json`, que escucha en 0.0.0.0 (el de `src/` escucha en 127.0.0.1 y no sirve dentro del contenedor).
- La web instala con `pnpm install --ignore-scripts`, porque el postinstall de msw aborta pnpm 12 y solo hace falta en los tests.
- `RUMBO_DB_PASSWORD` tiene que ser alfanumérica: va dentro de `DATABASE_URL`.
- Menores pendientes:
  - `auth-emulator` no tiene healthcheck: los e2e deben esperar a que `:9099` responda.
  - Las `VITE_FIREBASE_*` e `IA_MODELO` todavía no las lee nadie.
  - La cuenta de servicio de Firebase para producción queda para M10.
- Modelos: implementación y fix con sonnet; review con opus (0 bloqueantes, 5 menores, todos arreglados).
- Verificado levantando el stack base en el puerto 8088:
  - `/api/salud`, la web y el fallback de la SPA responden 200.
  - Los redirects conservan el puerto.
  - Con el override e2e, `IA_MODELO=falso` y el emulador queda `ready`.
