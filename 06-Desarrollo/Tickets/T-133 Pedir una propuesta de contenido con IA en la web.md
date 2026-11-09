---
id: T-133
titulo: Pedir una propuesta de contenido con IA en la web
modulo: M9 — Redes e IA
capa: web
estado: hecho
depende_de: [T-132]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-20, RF-119, RF-121, RF-122]
origen: plan
asignado: palomap2003
tomado_el: 09/11/26 13:26
rama: feature/T-133-pedir-una-propuesta-de-contenido-con-ia
pr:
---
# T-133 Pedir una propuesta de contenido con IA en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde Redes se pide una propuesta a la IA, se revisan los borradores, se regeneran o descartan, y se guarda el elegido como pieza.

## Criterios de aceptación
- [ ] Formulario del pedido y vista de borradores.
- [ ] Regenerar, descartar y guardar como pieza (RF-121).
- [ ] Error de la IA mostrado con opción de reintentar.

## Tests esperados
`describe('RF-119 propuesta')`, `describe('RF-121 guardar borrador')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 27 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-20 Generar propuesta de contenido con IA]]

## Archivos probables
- `src/apps/web/src/features/redes/`

## Fuera de alcance
- —

## Notas de implementación
- Componentes nuevos: `PropuestaIA.tsx`, un panel lateral `dialog` con foco atrapado (patrón de `PanelDetalleAlerta`), y `BorradoresPropuesta.tsx`. El botón «Propuesta con IA» está en el encabezado de Redes y en las tarjetas en idea y en producción. Usa los hooks de `@rumbo/shared`, sin cambios en el contrato.
- **Decisiones de Paloma**, registradas en [[CU-20 Generar propuesta de contenido con IA|CU-20]] A3 y A4:
  - La propuesta se pide desde una pieza o desde el encabezado.
  - Desde una pieza, el canal queda fijo y se guarda con `PATCH {texto}`: la pieza conserva su título.
  - Desde el encabezado, se guarda con `POST /contenidos`. El título es editable y viene precargado (no se pisa si se editó a mano), la fecha es obligatoria y el canal es el del pedido que generó los borradores, con un aviso si se cambió.
  - La nota de T-132 (CU-19 A1: invocar la IA desde una pieza ya creada) queda cubierta.
- Rojo: en el verde se corrigió, con autorización, un selector ambiguo del test (`/^propuesta con ia$/i`). Los tests nuevos de la review se agregaron en el fix con `--tocar-tests`.
- Review (opus) en 2 rondas.
  - 1.ª ronda: 3 importantes (foco del dialog, borradores perdidos si falla regenerar, canal cambiado tras generar) y 3 menores, todos arreglados.
  - 2.ª ronda: 3 menores, 2 arreglados.
  - **Menor pendiente:** sin fondo bloqueante, si con el panel abierto se abre la propuesta de otra tarjeta, al cerrar el foco vuelve a la primera.
- Modelos: tests sonnet, implementación y fix sonnet, refactor sonnet (sin cambios), review opus. Sin escalados.
