---
id: T-156
titulo: Listar las etiquetas de clientes en uso
modulo: M2 — Clientes
capa: backend
estado: hecho
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

## Notas de implementación- **Cierre (23/10/26):** `GET /clientes/etiquetas` devuelve `list[str]` y va antes de `/{cliente_id}`. Deduplica en SQL con `unnest` + `GROUP BY` y se queda con la variante **más usada**: si empatan, la primera alfabética, sin espacios de más. Ordena por la clave normalizada. Respeta la `visibilidad` de `politicas`.
  - **Hallazgo importante de la review (arreglado):** el filtro exacto de `GET /clientes?etiquetas=` no encontraba las otras variantes de la etiqueta que devuelve el menú. Ahora `paginar` compara normalizado con un `EXISTS` sobre `unnest`, con la misma expresión que `nombre_normalizado`, que se extrajo a `espacios_colapsados` en `modelos/base.py`. Así cambió también el filtro de T-041: deja de distinguir mayúsculas, tildes y espacios. El mock de shared usa la misma clave.
  - **Test agregado en el fix** (autorizado por el orquestador, `--tocar-tests`): `test_rf031_etiqueta_listada_filtra_todas_sus_variantes`.
  - **Menor resuelto:** la deduplicación pasó a SQL. Queda sin tests propios en shared el hook `useEtiquetasClientes`, que lo va a ejercitar T-157.
  - **Modelos:** tests con Sonnet; verde, refactor (sin cambios) y fix con Sonnet; review con Opus. No hubo escalados.
  - **Checks:** el backend tiene 826 tests en verde, con 96,6 % de cobertura total y 99 % en negocio; ruff y mypy pasan limpios. Shared tiene 107 tests y web 168 (92,5 %); lint y typecheck pasan limpios.
