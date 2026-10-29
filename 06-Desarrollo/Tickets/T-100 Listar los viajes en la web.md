---
id: T-100
titulo: Listar los viajes en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-086, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-08, RF-037]
origen: plan
asignado: palomap2003
tomado_el: 29/10/26 18:50
rama: feature/T-100-listar-los-viajes-en-la-web
pr:
---
# T-100 Listar los viajes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El listado de viajes muestra estado, fechas, cliente y saldo, con filtros y la vista propia del `freelance`.

## Criterios de aceptación
- [ ] Tabla con filtros por estado, fechas y «lo mío».
- [ ] Saldo y porcentaje pagado visibles.
- [ ] Vista del `freelance` (pantalla 42).

## Tests esperados
`describe('RF-037 listado de viajes')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 14, 42 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-08 Gestionar estado del viaje]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- La ficha (ticket propio).

## Notas de implementación
- `PaginaViajes.tsx` (estado y filtros) y `TablaViajes.tsx` (render), con la ruta `viajes` en `App.tsx` vía `SeccionViajes`. Admin y dueño arrancan en «Toda la agencia»; empleado y freelance en «Mis viajes». El freelance siempre pide `mios=true` y ve solo esa pestaña, con el aviso de la pantalla 42. El % pagado se redondea hacia abajo, para que un viaje con saldo no muestre 100 %.
- **Limitación conocida:** cliente y destino se resuelven con la primera página de `useClientes` y `useDestinos` (100, el máximo). Con más de 100 clientes, algunas filas quedan sin nombre. Se sumó a [[T-091 Listar los viajes con su situación económica|T-091]] que el contrato traiga `cliente_nombre` y `destino_nombre`.
- Review (opus): 2 importantes (lint del test, que se corrigió con autorización, y el nombre del cliente, que pasó a T-091) y 5 menores. Se arreglaron el texto del aviso del freelance, `Math.floor`, la pestaña sola del freelance, la aserción de la pestaña por defecto del dueño, y la leyenda y «Operación» de la pantalla 14. Pendiente de UI, sin ticket: buscador, columnas «Responsable» y «Próximo evento», botón «Ver calendario» y barra de % pagado de la pantalla 14.
- Modelos: tests sonnet, implementación, refactor (sin cambios) y fix sonnet, review opus. Sin escalados.
