---
id: T-156
titulo: Listar las etiquetas de clientes en uso
modulo: M2 — Clientes
capa: backend
estado: tomado
depende_de: [T-041]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RF-031, RF-151]
origen: hallazgo T-044 (decidido el 23/10/26)
asignado: FranLucianoo
tomado_el: 23/10/26 17:58
rama: feature/T-156-listar-las-etiquetas-de-clientes-en-uso
pr:
---
# T-156 Listar las etiquetas de clientes en uso

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La web puede ofrecer un menú con las etiquetas que ya existen en los clientes, en lugar de un campo de texto libre (RF-031: etiquetas «libres, múltiples y combinables»).

## Criterios de aceptación
- [ ] `GET /clientes/etiquetas` devuelve las etiquetas distintas en uso, ordenadas alfabéticamente y sin distinguir mayúsculas ni tildes al deduplicar. Contrato, tipos, hook y mock incluidos.
- [ ] Respeta la visibilidad: el `freelance` solo ve las etiquetas de sus propios clientes.
- [ ] Todos los roles pueden consultarlo.

## Tests esperados
`tests/api/test_clientes.py`: `test_rf031_lista_etiquetas_en_uso`, `test_rf031_etiquetas_sin_duplicados`, `test_rf151_freelance_ve_solo_sus_etiquetas`.

## Contexto (leer solo esto)
- RF-031 en [[Requisitos funcionales]]
- [[RN-10 Visibilidad por propiedad y rol]]

## Archivos probables
- `src/backend/rumbo/datos/repositorios/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`
- `src/packages/shared/`

## Fuera de alcance
- Administrar etiquetas: siguen siendo libres y se cargan en la ficha.

## Notas de implementación