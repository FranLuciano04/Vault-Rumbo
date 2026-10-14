---
id: T-020
titulo: Armar el shell web con la navegación por rol
modulo: M0 — Fundaciones
capa: web
estado: libre
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-11, RNF-14, RNF-16, CU-24]
origen: plan
asignado:
tomado_el:
rama:
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
