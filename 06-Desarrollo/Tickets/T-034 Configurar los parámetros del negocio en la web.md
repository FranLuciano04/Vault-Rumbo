---
id: T-034
titulo: Configurar los parámetros del negocio en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: hecho
depende_de: [T-026, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-13, DEC-0013, RF-083, RF-084]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 22/10/26 21:15
rama: feature/T-034-configurar-los-parametros-del-negocio-en
pr:
---
# T-034 Configurar los parámetros del negocio en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña tienen la sección Configuración con sus pestañas, y en la de parámetros editan los valores del negocio y la comisión por defecto de cada vendedor.

## Criterios de aceptación
- [ ] La sección Configuración con las pestañas del prototipo (parámetros, usuarios, destinos, operadores), visible solo para `admin` y `dueno`.
- [ ] Formulario de parámetros con validación zod y errores 422 del servidor en sus campos.
- [ ] Comisión por defecto por vendedor (importe o porcentaje) con validación de rango.

## Tests esperados
`describe('RF-083 comisión por defecto')`, `describe('RF-084 validación')`, parámetros con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 30, 51 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-13 Configurar porcentaje de comisión]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]

## Archivos probables
- `src/apps/web/src/features/configuracion/`

## Fuera de alcance
- Las otras pestañas (tickets propios).

## Notas de implementación
- **Modelos:** tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados.
- **Tests tocados después del rojo (autorizado por Nahuel, `--tocar-tests`):** en el verde, solo el setup de MSW (`crearServidor(...manejadoresM1)`) y el tipo `JsonBodyType` de `cuerpo` en `PaginaConfiguracion.test.tsx`; en el fix, solo se agregaron casos (422 con `campo: "body"`, 2 decimales, anticipación 0, usuario sin comisión, GET con error). Ninguna aserción cambió.
- **Rojo verificado a mano:** `fase rojo` aceptó como rojo un `pnpm: command not found` (en el bash de esta PC hay que usar `corepack pnpm`). Los 36 tests fallaban por el motivo correcto. Hallazgo para `tickets.mjs`: no tratar el código 127 como rojo.
- **Review:** 0 bloqueantes; 2 importantes (422 de nivel modelo tragado en silencio, decimales de la comisión) y 3 menores (usuario sin comisión, errores de carga, `por_pagina` 100) arreglados en el fix.
- **Pendiente:** labels y botones inventados desde CU-13 (no se pudieron leer los PNG de las pantallas 30 y 51); comparar con el prototipo. Las otras tres pestañas quedan deshabilitadas (tickets propios). No hay forma de quitar una comisión (el contrato lo permite; CU-13 no lo pide).
