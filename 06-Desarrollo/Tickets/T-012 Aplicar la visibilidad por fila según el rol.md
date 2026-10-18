---
id: T-012
titulo: Aplicar la visibilidad por fila según el rol
modulo: M0 — Fundaciones
capa: backend
estado: tomado
depende_de: [T-007, T-009]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [RF-151, RF-150, RNF-02, DEC-0005, DEC-0008]
origen: plan
asignado: FranLucianoo
tomado_el: 18/10/26 20:00
rama: feature/T-012-aplicar-la-visibilidad-por-fila-segun-el
pr:
---
# T-012 Aplicar la visibilidad por fila según el rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`negocio/politicas.py` decide qué filas ve cada rol y qué puede escribir, y los repositorios **exigen** el filtro de visibilidad como parámetro obligatorio, así ningún módulo puede olvidarlo.

## Criterios de aceptación
- [ ] `visibilidad(actor)` devuelve un filtro: el `freelance` ve solo lo propio (clientes asignados y lo que cuelga de ellos); los demás roles ven toda la agencia.
- [ ] El repositorio base no tiene un valor por defecto para la visibilidad; una fila no visible responde 404 (no 403).
- [ ] `exigir_rol` y `exigir_escritura` lanzan `SinPermiso` (403) según la matriz de roles de DEC-0005/DEC-0008.

## Tests esperados
`tests/negocio/test_politicas.py`: `test_rf151_freelance_solo_ve_lo_propio`, `test_rf151_empleado_ve_toda_la_agencia`, `test_rf151_fila_ajena_da_404`, permisos por rol con fábricas.

## Contexto (leer solo esto)
- [[DEC-0005 Autenticación y modelo de roles|DEC-0005]]
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]
- [[ARQ — Vista general]] — `negocio/politicas.py` y «visibilidad por fila»
- [[Prototipo UI]] — «Vistas por rol»

## Archivos probables
- `src/backend/rumbo/negocio/politicas.py`
- `src/backend/rumbo/datos/repositorios/base.py`
- `src/backend/tests/negocio/test_politicas.py`

## Fuera de alcance
- Las reglas propias de cada módulo (las aplica cada servicio usando estas políticas).

## Notas de implementación
