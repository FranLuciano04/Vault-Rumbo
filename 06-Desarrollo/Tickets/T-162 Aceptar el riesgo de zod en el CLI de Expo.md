---
id: T-162
titulo: Aceptar el riesgo de zod en el CLI de Expo
modulo: M0 — Fundaciones
capa: infra
estado: tomado
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-15]
origen: hallazgo T-156
asignado: FranLucianoo
tomado_el: 23/10/26 18:35
rama: feature/T-162-aceptar-el-riesgo-de-zod-en-el-cli-de-ex
pr:
---
# T-162 Aceptar el riesgo de zod en el CLI de Expo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El job `web` del CI vuelve a pasar `pnpm audit --audit-level=high`. Hoy falla en todos los PR por GHSA-mrhx-c7xc-m3w5, una vulnerabilidad alta de `zod` <4.6.6 publicada el 01/10/26, que llega por `@expo/cli`. `@expo/cli` pide `zod ^3.25.76` y no existe parche en la 3.x. Forzar zod 4 sería un cambio de versión mayor sobre el CLI. Ese zod corre solo en build y desarrollo y no forma parte de la app, igual que node-forge y braces, que ya están ignoradas.

## Criterios de aceptación
- [ ] `src/pnpm-workspace.yaml` suma GHSA-mrhx-c7xc-m3w5 a `audit.ignore`, con el mismo formato de comentario que las otras: severidad, por dónde entra, «Riesgo aceptado por Francisco (23/10/26)» y que hay que revisarlo cuando Expo pase a zod 4.
- [ ] `pnpm why zod -r` confirma que todas las rutas al zod vulnerable pasan por el CLI de Expo. Si alguna llega al código de la app web o mobile, se para y se avisa.
- [ ] `pnpm audit --audit-level=high`, ejecutado desde `src`, termina con código 0.

## Contexto (leer solo esto)
- `src/pnpm-workspace.yaml` (bloques `overrides` y `audit.ignore`)
- [[T-019 Sumar los análisis de seguridad al CI]]

## Archivos probables
- `src/pnpm-workspace.yaml`

## Fuera de alcance
- Actualizar Expo.

## Notas de implementación
