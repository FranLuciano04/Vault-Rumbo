# 7. Tecnologías

Rumbo es una aplicación **cliente-servidor**: dos clientes, web y mobile, se comunican en JSON con una única API, que concentra todas las reglas del negocio y el acceso a la base de datos. Todo el backend corre en un servidor dentro de la agencia.

## Resumen del stack

| Pieza | Tecnología | Rol |
|---|---|---|
| **Web** | React + TypeScript + Vite | Gestión completa: el back office de la agencia. |
| **Mobile** | React Native + Expo | Acceso rápido a la agenda, las alertas y los clientes. Se distribuye de forma interna, sin tiendas públicas. |
| **Paquete compartido** | TypeScript, zod, Axios y TanStack Query | Tipos generados desde el contrato de la API, validaciones y acceso a los datos, reutilizados por web y mobile. |
| **API** | Python + FastAPI, con Pydantic | Única puerta al dominio, organizada en capas: presentación, lógica de negocio y acceso a datos. |
| **Base de datos** | PostgreSQL, con SQLAlchemy 2.0 (asíncrono) y Alembic para las migraciones | Persistencia de las 13 entidades del dominio. |
| **Proceso automático** | Contenedor con cron | Todos los días a las 00:00 vence pagos y cotizaciones y genera alertas, con los mismos servicios que la API. |
| **Servidor** | Ubuntu Server LTS, Docker Compose y una UPS | Aloja la API, la base, el proceso automático y el servidor web. |
| **Calidad y despliegue** | GitHub Actions con un runner propio en el servidor | Análisis estático, tipos, pruebas y seguridad en cada cambio; despliega solo si todo pasa. |

La funcionalidad de inteligencia artificial del producto (el borrador de contenido para redes, CU-20) se resuelve con **LangChain** y la API de **Claude**; la elección del modelo y su justificación se presentan en el documento de inteligencia artificial.

## Backend

- **Python + FastAPI:** API REST que publica automáticamente su contrato OpenAPI, del que se generan los tipos de los clientes.
- **Pydantic:** valida el JSON de cada pedido y de cada respuesta contra el contrato.
- **PostgreSQL:** base de datos relacional, con integridad referencial y restricciones que impiden datos incoherentes.
- **SQLAlchemy 2.0 (asíncrono) y Alembic:** acceso a datos y migraciones versionadas del esquema.
- **uv:** gestión de paquetes y entornos virtuales de Python.

## Frontend web

- **React + TypeScript + Vite.**
- **TanStack Query:** consulta de datos, caché y estados de las solicitudes.
- **Axios:** cliente HTTP.

## Frontend mobile

- **React Native + Expo.**
- **EAS Build:** generación de los instalables para Android e iOS, que se distribuyen de forma interna.
- **TanStack Query + Axios:** la misma capa de acceso a la API que la web, a través del paquete compartido.

## Compartido entre web y mobile

- **TypeScript** como lenguaje común.
- **openapi-typescript:** tipos generados desde el contrato OpenAPI de la API.
- **zod:** esquemas y validaciones compartidas.
- Los mismos *hooks* de TanStack Query en las dos aplicaciones.

El código se organiza en un **monorepo**:

```text
apps/
├── web/             # React + Vite
└── mobile/          # React Native + Expo
packages/
└── shared/          # tipos, esquemas, cliente y hooks compartidos
backend/             # FastAPI, con entorno propio de uv
```

Los paquetes de TypeScript se gestionan con **pnpm workspaces** y el backend con **uv**.

## Calidad y pruebas

| Área | Calidad estática | Pruebas |
|---|---|---|
| Backend | ruff · mypy | pytest · pytest-asyncio · httpx · pytest-cov · factory-boy / faker |
| Web | ESLint · Prettier · `tsc --noEmit` | Vitest · React Testing Library · Playwright |
| Mobile | ESLint · Prettier · `tsc --noEmit` | Jest · React Native Testing Library · Maestro |

## Seguridad

- **pip-audit** y **pnpm audit:** vulnerabilidades conocidas en las dependencias.
- **bandit:** análisis estático del código Python.
- **Semgrep:** análisis en varios lenguajes con reglas OWASP.
- **gitleaks:** detección de secretos en el repositorio.
- **Dependabot:** actualización automática de las dependencias.

## Integración y despliegue continuos

Cada cambio dispara un pipeline en **GitHub Actions**: análisis estático → verificación de tipos → pruebas → seguridad. Cuando el pipeline pasa en la rama principal, un **runner propio instalado en el servidor de la agencia** reconstruye y levanta los contenedores. El repositorio de código es privado y el runner solo ejecuta trabajos de la rama principal.

## Infraestructura

El sistema se despliega **en un servidor dentro de la agencia**: una mini PC dedicada con Ubuntu Server LTS y una UPS para absorber cortes de luz breves. Corre con **Docker Compose**, en cinco servicios:

| Servicio | Función |
|---|---|
| `nginx` | Sirve la web compilada y deriva las llamadas a `/api` al backend. |
| `api` | La API en FastAPI. |
| `postgres` | La base de datos, con un volumen persistente. |
| `scheduler` | Ejecuta el proceso automático diario a las 00:00, hora de Buenos Aires. El proceso es idempotente: si corre dos veces el mismo día, no duplica alertas ni vencimientos. |
| `cloudflared` | El conector de **Cloudflare Tunnel**, por el que entran todos los usuarios. |

Todos los usuarios, también los que están en la red de la agencia, acceden por la dirección pública del túnel. Así no se abren puertos en el router, el tráfico viaja cifrado con TLS y el acceso no depende de la IP pública del local. La entrada directa desde la red local queda como respaldo si se corta internet.

## Por qué este stack

- **Un solo lenguaje en los clientes.** React y React Native comparten TypeScript, los tipos, las validaciones y el acceso a los datos, y el equipo ya tiene experiencia con ellos. Una web responsive sola no alcanzaba, porque el relevamiento pide una aplicación mobile.
- **El contrato manda.** FastAPI publica el contrato OpenAPI y de él se generan los tipos de la web y del mobile, lo que reduce las diferencias entre backend y clientes.
- **Datos relacionales.** PostgreSQL encaja con un dominio de entidades muy relacionadas (clientes, viajes, pagos, alertas) que necesita integridad referencial.
- **Sin costo mensual de hosting.** El servidor en la agencia evita un gasto fijo y deja los datos en el local. Docker Compose permite mover el mismo despliegue a un servidor en la nube sin reescribir nada, y Cloudflare Tunnel resuelve el acceso externo sin exponer la red de la agencia.
