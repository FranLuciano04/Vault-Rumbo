---
id: T-002
titulo: Crear el workspace pnpm con la app web
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: []
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0001, DEC-0015]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 15/10/26 17:18
rama: feature/T-002-crear-el-workspace-pnpm-con-la-app-web
pr:
---
# T-002 Crear el workspace pnpm con la app web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existe el workspace pnpm en `src/` con `apps/web` (React + Vite + TypeScript estricto + React Router + Tailwind + shadcn/ui) y la configuración compartida de TypeScript, ESLint y Prettier, lista para que los tickets de web trabajen.

## Criterios de aceptación
- [ ] `pnpm install` en `src/` resuelve el workspace (`apps/*`, `packages/*`).
- [ ] `pnpm --filter @rumbo/web dev|lint|typecheck|test` funcionan; Vitest + Testing Library corren un test de humo.
- [ ] shadcn/ui inicializado con Tailwind y alias de rutas; `tsconfig` base estricto sin `any` implícito.

## Tests esperados
No sigue TDD (`infra`). Se verifica corriendo los scripts del workspace.

## Contexto (leer solo esto)
- [[Spec de implementación]] §3, §4 y §5
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §4 (Tailwind + shadcn/ui)

## Archivos probables
- `src/package.json`
- `src/pnpm-workspace.yaml`
- `src/tsconfig.base.json`
- `src/apps/web/`

## Fuera de alcance
- Pantallas, tokens del Figma y Playwright (tickets propios).

## Notas de implementación
- **pnpm vía corepack:** pnpm no estaba en el PATH; se usó `corepack pnpm` (fijado `packageManager: pnpm@12.11.2`). Cada integrante necesita `corepack enable`. En Windows, `tickets.mjs fase --test` hay que correrlo desde Git Bash: desde PowerShell, `bash` resuelve al de WSL y falla.
- **TypeScript `~6.0.3`:** typescript-eslint 8.71 exige `<6.1`.
- **shadcn/ui inicializado a mano** (`components.json` new-york, `cn`, set completo de variables neutral con `.dark`), porque el CLI no encuentra pnpm en el PATH. Todavía no hay `components/ui/`. Ojo: el CLI intenta instalar un paquete `cn`, así que hay que revisar `package.json` después de cada `shadcn add`.
- **Cobertura:** `test -- --coverage` no medía nada; se agregó el script `test:cobertura` y se corrigió la Spec §4 (web y mobile).
- **React Router:** se usa `react-router` (v8), no `react-router-dom`.
- **Menores que quedaron abiertos:** `minimumReleaseAgeExclude` en `pnpm-workspace.yaml` (vitest y jsdom recién publicados) es temporal y hay que sacarlo cuando superen la antigüedad mínima. `@testing-library/user-event` se instaló sin usar, a propósito para los tickets de web.
- **Modelos:** implementación y fix con sonnet; review con opus (reviewer-ticket). Sin escalados.
