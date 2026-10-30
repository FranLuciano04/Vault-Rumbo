---
id: T-104
titulo: Registrar el cobro de un pago en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-103]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-12, RF-067, RF-068, RF-070, RF-071]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 11:04
rama: feature/T-104-registrar-el-cobro-de-un-pago-en-la-web
pr:
---
# T-104 Registrar el cobro de un pago en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra el cobro de un pago (forma de pago, moneda y tipo de cambio) y se revierte un cobro cargado por error; la ficha refleja el nuevo saldo y estado.

## Criterios de aceptación
- [ ] Diálogo de cobro del prototipo con forma de pago y moneda.
- [ ] Revertir cobro con confirmación.
- [ ] Saldo y estado del viaje actualizados tras la operación.

## Tests esperados
`describe('RF-067 cobro')`, `describe('RF-068 otra moneda')`, `describe('RF-070 revertir')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 18 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-12 Registrar cobro de un pago]]

## Archivos probables
- `src/apps/web/src/features/viajes/plan/`

## Fuera de alcance
- —

## Notas de implementación
- **Implementación (30/10/26, Francisco):**
  - `plan/CobroDePago.tsx` es nuevo: el diálogo «Registrar cobro» con fecha efectiva, las seis formas de pago, moneda ARS/USD y «Tipo de cambio (ARS por USD)», que solo aparece si la moneda difiere de la del viaje, con vista previa orientativa.
  - En `PanelDePago`, «Revertir cobro» pide confirmación, como anular. La fila cobrada muestra la forma de pago.
  - La ficha (saldo, % pagado y estado) y las alertas se refrescan porque `useRegistrarCobro` y `useRevertirCobro` invalidan `["viajes"]` y `claveAlertas`.
  - No hay `Dialog` de shadcn en `components/ui`, así que el diálogo es un `<form role="dialog">` inline, como `PanelDePago`. Sin `aria-modal`, y con el foco en la fecha al abrir.
  - El tipo de cambio se carga en es-AR («1.250,50»), con hasta 4 decimales. Reutiliza `IMPORTE` e `importeComoTexto` de `oportunidades/cotizaciones/`, un import entre features.
  - Review (Opus): 0 bloqueantes, 1 importante y 4 menores.
    - **Importante:** «1.250» se tomaba como 1,25.
    - **Menores arreglados:** el regex sin el límite de 4 decimales, la rama muerta (en el refactor) y `aria-modal`. Con autorización, se agregó un test para «1.250» y se corrigió el lint del test.
    - **Menor pendiente:** no hay un test propio de que la ficha refresque el saldo, porque lo cubre el mecanismo compartido de `useAccion`.
  - **Para tener en cuenta:** revertir un cobro en el backend es T-095, que todavía responde 501. Hasta entonces, la web muestra el error del servidor.
  - Modelos: tests, implementación, refactor y fix con Sonnet; review con Opus.
