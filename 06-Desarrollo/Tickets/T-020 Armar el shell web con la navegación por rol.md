---
id: T-020
titulo: Armar el shell web con la navegación por rol
modulo: M0 — Fundaciones
capa: web
estado: hecho
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-11, RNF-14, RNF-16, CU-24]
origen: plan
asignado: FranLucianoo
tomado_el: 18/10/26 19:32
rama: feature/T-020-armar-el-shell-web-con-la-navegacion-por
pr:
---
# T-020 Armar el shell web con la navegación por rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La web tiene el layout del prototipo (barra lateral, encabezado), los tokens de diseño del Figma, las rutas protegidas que consultan `/auth/yo` y una navegación que muestra a cada rol solo sus secciones.

## Criterios de aceptación
- [ ] `estilos/tokens.css` y el tema de Tailwind reproducen colores, tipografía y espaciados del sistema de diseño del prototipo.
- [ ] Cada rol ve exactamente las secciones de la tabla «Vistas por rol»; sin sesión, cualquier ruta redirige al login.
- [ ] `lib/formato.ts` formatea importes en ARS/USD y fechas `dd/mm/aa`.

## Tests esperados
`describe('RF-141 navegación por rol')` con el mock de `/auth/yo` para cada rol; ruta protegida sin sesión; formato de importes y fechas.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 1, 3, 28, 51 (PNG en `07-Entregables/Prototipo/img/`)
- [[Prototipo UI]] — «Sistema de diseño» y «Vistas por rol»
- [[Spec de implementación]] §5

## Archivos probables
- `src/apps/web/src/app/`
- `src/apps/web/src/estilos/tokens.css`
- `src/apps/web/src/lib/formato.ts`

## Fuera de alcance
- El login (ticket siguiente) y el contenido de cada sección.

## Notas de implementación
- **Shell:** `App` recibe `cliente: AxiosInstance`. `RutaProtegida` consulta `/auth/yo`: con 401 manda a `/login` (placeholder), con otro error muestra un alerta. `Shell` tiene la barra lateral `nav` y el `header` con nombre y rol. `SeccionPendiente` redirige a `/agenda` si el rol no ve la sección.
- **Visibilidad:** la tabla «Vistas por rol» vive en `app/navegacion.ts` como función pura. Redes depende de `acceso_redes` y nunca la ve el `freelance`.
- **Formato:** importes con aritmética de strings y BigInt, half-up a 2 decimales, con validación de la entrada. Fechas `dd/mm/aa` en hora de Buenos Aires. Las entradas inválidas lanzan un error explícito.
- **Tokens:** paleta del prototipo (`#22506F`, `#73A5C4`, `#D9D9D9`), Plus Jakarta Sans y espaciado de 4 px. `#E6EFF5` (secondary/accent) es un tono derivado que el prototipo no fija. El modo `.dark` queda con los valores de shadcn.
- **Fuente:** se sirve desde la app con `@fontsource/plus-jakarta-sans` ^5.3.0 (dependencia nueva, aprobada por Francisco) y sin pedidos a Google, por RNF-16 y DEC-0011.
- **Dependencias:** a la web se le sumaron `@rumbo/shared`, `@tanstack/react-query`, `axios` y `msw`, que ya estaban en el stack (§3).
- **Tests tocados con autorización de Francisco:** se reemplazó el `App.test.tsx` placeholder de T-002 y se corrigió la forma (lint) de `App.shell.test.tsx` y `formato.test.ts`. En el fix se sumaron tests de redondeo, de fecha inválida y del error 500 de sesión.
- **Pendiente para tickets posteriores:** íconos por sección, barra lateral responsive, y cerrar sesión con menú de usuario (login).
- **Entorno:** `pnpm` no estaba en el PATH, así que se usó `corepack pnpm`.
- **Modelos:** tests e implementación con Sonnet, review con Opus. Sin escalados.
