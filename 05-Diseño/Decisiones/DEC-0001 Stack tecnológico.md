---
tipo: decision
estado: formalizado
modulo: []
decisores: [Paloma, Nahuel, Francisco]
fecha_aprobacion: 11/09/26
supersede:
actualizado: 09/09/26
---
# DEC-0001 Stack tecnológico

tags:: #tipo/decision #estado/formalizado #pc/pc1

## Contexto
Rumbo es un proyecto integrador con web, mobile, backend, base de datos relacional, API REST e IA. Necesitamos fijar el stack antes de PC1 para que dominio y arquitectura sean coherentes. Nahuel elaboró esta propuesta técnica completa; queda pendiente la aprobación del equipo.

## Decisión

### Backend
- **Python + FastAPI:** API REST y contrato OpenAPI.
- **PostgreSQL:** base de datos relacional.
- **LangChain + Claude:** funcionalidades de IA integradas; Claude Code continúa como agente de desarrollo.
- **uv:** paquetes y entornos virtuales de Python.

### Frontend web
- **React + TypeScript + Vite**.
- **TanStack Query:** fetching, caché y estados de las solicitudes.
- **Axios:** cliente HTTP.

### Frontend mobile
- **React Native + Expo**.
- **EAS Build:** generación de binarios `.apk` / `.ipa` en la nube.
- **TanStack Query + Axios:** misma capa de acceso a la API que la web, mediante el paquete compartido.

### Compartido entre web y mobile
- **TypeScript:** lenguaje común.
- **openapi-typescript:** tipos TypeScript generados desde el esquema OpenAPI de FastAPI.
- **zod:** esquemas y validaciones compartidas.
- Hooks de **TanStack Query** reutilizados entre las aplicaciones.

### Organización y paquetes
Monorepo con esta estructura inicial:

```text
apps/
├── web/             # React + Vite
└── mobile/          # React Native + Expo
packages/
└── shared/          # tipos, esquemas, cliente y hooks compartidos
backend/             # FastAPI, con entorno propio de uv
```

- **pnpm workspaces:** paquetes Node/TypeScript del monorepo.
- **uv:** entorno y dependencias de `backend/`.

### Calidad y pruebas
| Área | Calidad estática | Pruebas |
|---|---|---|
| Backend | ruff · mypy | pytest · pytest-asyncio · httpx `AsyncClient` · pytest-cov · factory-boy / faker |
| Web | ESLint · Prettier · `tsc --noEmit` | Vitest · React Testing Library · Playwright |
| Mobile | ESLint · Prettier · `tsc --noEmit` | Jest · React Native Testing Library · Maestro |

### Seguridad
- **pip-audit** y **pnpm audit:** vulnerabilidades de dependencias.
- **bandit:** análisis estático de Python.
- **Semgrep:** análisis multi-lenguaje con reglas OWASP.
- **gitleaks:** detección de secretos.
- **Dependabot:** actualizaciones automáticas de dependencias (pnpm y uv). Elegido el 29/09/26 sobre Renovate porque viene integrado en GitHub y no requiere instalación; Renovate agrupa mejor en un monorepo, pero para esta etapa no justifica la configuración extra.

### CI/CD y distribución
- **GitHub Actions:** pipeline por push: lint → type-check → tests → seguridad → deploy cuando la infraestructura esté definida.
- **Mobile:** distribución interna directa de `.apk` / `.ipa`, sin tiendas públicas.
- **Infraestructura:** ✅ decidida el 29/09/26 en [[DEC-0011 Infraestructura de despliegue on-premise]]: servidor on-premise en la agencia, con Nginx y un runner self-hosted de GitHub Actions.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| React + React Native | Un lenguaje (JS/TS), equipo con experiencia, reúso de lógica | Dos apps a mantener | ✅ |
| Solo web responsive | Menos superficie | El relevamiento pide mobile | ❌ |
| FastAPI + PostgreSQL | Contrato OpenAPI, tipado generado y persistencia relacional | Requiere coordinar ecosistemas Python y TypeScript | ✅ |
| Otro LLM | — | Los 3 ya pagan y conocen Claude | ❌ (ver relevamiento) |

## Justificación
React y React Native permiten compartir tipos, validaciones y acceso a datos. FastAPI publica el contrato OpenAPI del que se generan los tipos TypeScript, reduciendo diferencias entre backend, web y mobile. PostgreSQL encaja con el modelo relacional y el equipo ya usa Claude como herramienta de desarrollo.

## Impacto
- Afecta: [[ARQ — Vista general]], todas las entidades (persistencia en PostgreSQL).
- Restricciones: alcance sin pagos online ni GDS ([[Alcance y fuera de alcance]]).
- ✅ Pendientes cerrados: infraestructura en [[DEC-0011 Infraestructura de despliegue on-premise]], Dependabot (29/09/26) y autenticación y roles en [[DEC-0008 Autenticación propia y rol de vendedor freelance]].

## Decisores y fecha
- Propuesta técnica: Nahuel.
- Decisores: Paloma, Nahuel, Francisco — **Aprobada: 11/09/26** (sync; Francisco y Nahuel presentes, Paloma notificada por Git).

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
