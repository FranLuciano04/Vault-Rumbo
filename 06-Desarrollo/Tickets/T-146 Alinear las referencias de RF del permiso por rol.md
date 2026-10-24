---
id: T-146
titulo: Alinear las referencias de RF del permiso por rol
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
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
- **Sin rojo:** es un ticket solo de renombres y su criterio es que la suite pase igual. Se hizo un único paso de implementación con `--tocar-tests`, y se verificó en el diff que solo cambian referencias a RF-150/RF-151 y ninguna aserción.
- **Pasaron a RF-151:**
  - `politicas.py`: el módulo, `exigir_roles` y `puede_modificar`.
  - `dependencias.py`: `exigir_rol`.
  - Los docstrings de `listar_asesores` (servicio y router).
  - 20 tests: 13 en `test_politicas`, 1 en `test_configuracion`, 5 en `test_usuarios` y 2 en `test_clientes` (`freelance_no_edita_cliente_ajeno_404` y `freelance_edita_su_cliente`).
- **Siguen en RF-150 (asignación del freelance):** el alta y la conservación del asesor en `servicios/clientes.py`, más `test_rf150_freelance_queda_asignado`, `test_rf150_freelance_no_reasigna_su_cliente` y `test_rf150_alta_de_freelance_responde_con_el_propio_asesor`.
- **Review (Opus):** 3 menores, todos arreglados en el fix. El OpenAPI no cambia, porque el docstring de `listar_asesores` no llega al contrato.
- **Entorno:** una corrida de la fase fix tardó 41 min con 1 error transitorio de la base de tests. Al repetirla pasó en 22 s.
- **Modelos:** implementación y fix con Sonnet; review con Opus. No hubo escalados. No hubo refactor, porque no había nada que simplificar.