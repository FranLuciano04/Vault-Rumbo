---
tipo: decision
estado: formalizado
modulo: []
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 29/09/26
supersede:
actualizado: 29/09/26
---
# DEC-0011 Infraestructura de despliegue on-premise

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Decidida por el equipo completo el 29/09/26** (Francisco, Nahuel y Paloma), en la entrevista de diseño del día 0 del plan a 3 días.

## Contexto
[[DEC-0001 Stack tecnológico]] dejó abierta la infraestructura de despliegue: el servidor on-premise figuraba como alternativa, y de esa elección dependían Nginx y el runner self-hosted de CI. [[Requisitos funcionales]] fija cuatro criterios: disponibilidad 24/7 (RNF-13), respaldo diario con copia fuera del servidor (RNF-08), un proceso automático que corre todos los días a las 00:00 ([[DGM-ACT — Proceso automático diario]]) y un costo razonable para una PyME. El PC1 se adelantó al 02/10/26, así que la decisión se tomó sin una sync aparte.

## Decisión
- **Servidor on-premise en la agencia:** una mini PC dedicada con **Ubuntu Server LTS** y una **UPS** para absorber cortes de luz breves.
- **Ejecución con Docker Compose**, con cuatro servicios:
  - `nginx`: sirve la web compilada y deriva `/api` al backend;
  - `api`: FastAPI;
  - `postgres`: PostgreSQL con un volumen persistente;
  - `scheduler`: un contenedor con **cron** que a las **00:00**, en la zona horaria `America/Argentina/Buenos_Aires`, ejecuta el proceso diario como comando del backend (por ejemplo `python -m rumbo.jobs.diario`). El proceso es **idempotente**: si corre dos veces el mismo día, no duplica alertas ni vencimientos.
- **Acceso desde fuera de la agencia** (freelance y app mobile, RNF-14): **Cloudflare Tunnel** delante de Nginx. No abre puertos en el router, trae TLS y no depende de la IP pública del local. Su configuración **no es prioritaria** en esta etapa.
- **Despliegue:** un **runner self-hosted de GitHub Actions** instalado en el servidor. Cuando el pipeline de calidad de DEC-0001 pasa en `main`, ejecuta `docker compose up`. Condiciones: el repositorio de código es **privado** y el runner **solo ejecuta jobs de `main`**, porque un runner self-hosted en un repositorio público ejecutaría código de cualquier pull request.
- **Los requisitos no cambian.** RNF-08 y RNF-13 expresan necesidades del negocio y se mantienen tal como están. Lo que se difiere es la implementación:
  - **Respaldo (RNF-08):** no es prioritario para el PC1; el mecanismo (volcado diario y copia externa) se define y se implementa en PC2.
  - **Disponibilidad (RNF-13):** los cortes de luz o de internet del local quedan como **riesgo aceptado**, mitigado por la UPS.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| On-premise en la agencia | Sin costo mensual de hosting; los datos quedan en el local; el equipo controla todo el entorno | El 24/7 depende de la luz y de internet del local; el respaldo externo hay que armarlo aparte | ✅ |
| PaaS con PostgreSQL gestionado | Respaldo, TLS y disponibilidad resueltos por el proveedor | Costo mensual y dependencia del proveedor | ❌ |
| VPS propio | Barato y con IP pública | Hay que operar Nginx, TLS, cron y respaldo igual que on-premise, pero pagando por mes | ❌ |
| Acceso externo abriendo un puerto con DNS dinámico | Sin terceros | Depende de que el proveedor de internet dé IP pública; deja un puerto expuesto | ❌ |
| Acceso externo con VPN (Tailscale) | Red privada | Obliga a instalar una app en cada teléfono, incluidos los freelance | ❌ |
| Proceso diario con APScheduler dentro de FastAPI | Sin contenedor extra | Con más de un worker, cada uno lo ejecutaría | ❌ |

## Justificación
El equipo prioriza no tener costo mensual y mantener el control del entorno, y acepta a cambio el riesgo de disponibilidad del local. Docker Compose hace que el mismo despliegue se pueda mover a un VPS sin reescribir nada si ese riesgo deja de ser aceptable. Cloudflare Tunnel resuelve el acceso externo sin exponer la red de la agencia.

## Impacto
- [[ARQ — Vista general]]: la vista de despliegue tiene que reemplazar la caja «a definir» y sumar el `scheduler` (paso A2 del plan).
- [[DEC-0001 Stack tecnológico]]: se cierra su pendiente de infraestructura; Nginx y el runner self-hosted quedan confirmados.
- Riesgos aceptados: cortes de luz o de internet en la agencia; respaldo sin implementar hasta PC2.

## Decisores y fecha
- Decisores: Francisco, Nahuel y Paloma — **aprobada el 29/09/26**.

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
