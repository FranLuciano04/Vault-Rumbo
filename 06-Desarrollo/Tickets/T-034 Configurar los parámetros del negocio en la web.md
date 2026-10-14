---
id: T-034
titulo: Configurar los parámetros del negocio en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: libre
depende_de: [T-026, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-13, DEC-0013, RF-083, RF-084]
origen: plan
asignado:
tomado_el:
rama:
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
