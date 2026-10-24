---
id: T-146
titulo: Alinear las referencias de RF del permiso por rol
modulo: M1 — Usuarios y configuración
capa: backend
estado: tomado
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: haiku
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RF-150, RF-151, DEC-0005, DEC-0008]
origen: hallazgo T-030
asignado: palomap2003
tomado_el: 24/10/26 14:40
rama: feature/T-146-alinear-las-referencias-de-rf-del-permis
pr:
---
# T-146 Alinear las referencias de RF del permiso por rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El código nombra cada regla con el RF del catálogo: el permiso por rol (`exigir_rol`, `exigir_roles`, `SinPermiso`) y la visibilidad por fila son **RF-151**, y **RF-150** queda solo para «asignar al freelance los clientes que crea».

## Criterios de aceptación
- [ ] Los docstrings y comentarios de `negocio/politicas.py` y `presentacion/dependencias.py` citan RF-151 para el permiso por rol.
- [ ] Los tests que prueban el permiso por rol se nombran `test_rf151_…` (por ejemplo `tests/negocio/test_configuracion.py`, de T-030). Los que prueban la asignación de clientes del freelance siguen como RF-150.
- [ ] No cambia ningún comportamiento: la suite pasa igual.

## Tests esperados
Renombrar, sin cambiar aserciones. Correr la suite completa de backend.

## Contexto (leer solo esto)
- RF-150 y RF-151 en [[Requisitos funcionales]]
- [[RN-10 Visibilidad por propiedad y rol]]

## Archivos probables
- `src/backend/rumbo/negocio/politicas.py`
- `src/backend/rumbo/presentacion/dependencias.py`
- `src/backend/tests/`

## Fuera de alcance
- Cambiar reglas de permisos.

## Notas de implementación