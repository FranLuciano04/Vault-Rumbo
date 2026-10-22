---
id: T-147
titulo: Fijar con un test la comisión de un usuario dado de baja
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-030]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-13, RF-083, RF-153]
origen: hallazgo T-030
asignado:
tomado_el:
rama:
pr:
---
# T-147 Fijar con un test la comisión de un usuario dado de baja

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Queda fijado con tests lo decidido el 22/10/26 en [[CU-13 Configurar porcentaje de comisión]]: se puede configurar la comisión por defecto de cualquier usuario, incluido uno dado de baja, el propio admin y la dueña.

## Criterios de aceptación
- [ ] `PUT /usuarios/{id}/comision-por-defecto` sobre un usuario con `activo = false` responde 200 y guarda el valor.
- [ ] Un admin puede fijar su propia comisión y la de la dueña.

## Tests esperados
`tests/api/test_comision.py`: `test_rf083_usuario_inactivo_puede_tener_comision`, `test_rf083_admin_fija_su_propia_comision`, `test_rf083_admin_fija_la_comision_de_la_duena`. Hoy ya pasan: son tests de caracterización y no hay rojo. Comprobarlos con una mutación, por ejemplo filtrando por `activo` en el servicio, que debería hacerlos fallar.

## Contexto (leer solo esto)
- [[CU-13 Configurar porcentaje de comisión]] — sección Revisión (decisión del 22/10/26)

## Archivos probables
- `src/backend/tests/api/test_comision.py`

## Fuera de alcance
- Cambiar el servicio.

## Notas de implementación