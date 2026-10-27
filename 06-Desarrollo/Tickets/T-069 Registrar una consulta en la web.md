---
id: T-069
titulo: Registrar una consulta en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: tomado
depende_de: [T-061, T-039, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, RF-004, RF-010, RF-011, RF-012, RF-013]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 17:31
rama: feature/T-069-registrar-una-consulta-en-la-web
pr:
---
# T-069 Registrar una consulta en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra una consulta eligiendo un cliente o dándolo de alta en el momento, con el aviso de oportunidad abierta.

## Criterios de aceptación
- [ ] Formulario con buscador de cliente y alta rápida (A1).
- [ ] Aviso de oportunidad abierta con opción de ir a ella o confirmar (A2).
- [ ] Validación de datos mínimos (A3).

## Tests esperados
`describe('RF-010 registrar consulta')`, `describe('RF-012 oportunidad abierta')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 11 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-04 Registrar consulta]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- —

## Notas de implementación
