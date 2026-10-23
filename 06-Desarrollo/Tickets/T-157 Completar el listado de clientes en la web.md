---
id: T-157
titulo: Completar el listado de clientes en la web
modulo: M2 — Clientes
capa: web
estado: hecho
depende_de: [T-044, T-155, T-156]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-009, RF-031]
origen: hallazgo T-044 (decidido el 23/10/26)
asignado: FranLucianoo
tomado_el: 23/10/26 19:44
rama: feature/T-157-completar-el-listado-de-clientes-en-la-w
pr:
---
# T-157 Completar el listado de clientes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El listado de clientes de la web (T-044) queda completo y fiel al prototipo: columnas con datos reales, filtro de etiquetas múltiple y la vista del freelance como en la pantalla 39.

## Criterios de aceptación
- [ ] Las columnas Asesor, Último viaje y Oportunidades muestran los datos de T-155, con «—» solo cuando no hay dato.
- [ ] «Etiquetas» abre un menú con las etiquetas en uso (T-156) que permite elegir varias, con chips removibles. Un cliente aparece si tiene **todas** las etiquetas elegidas (combinables, RF-031). Reemplaza el campo de texto de T-044. La web manda `etiquetas` (parámetro repetido) y se retira el alias deprecado `etiqueta` del router, del hook `useClientes` y del mock (hallazgo T-041).
- [ ] El `freelance` ve «Mis clientes» como una etiqueta fija y no clickeable, junto al aviso de la pantalla 39 (decidido el 23/10/26).
- [ ] El alta y la edición de clientes (`ClienteCrear`, `ClienteEditar`) rechazan con 422 más de 20 etiquetas o una de más de 80 caracteres, con las mismas constantes que el filtro de `GET /clientes`. Esto venía de T-161, que se absorbió acá por pedido de Francisco el 23/10/26.

## Tests esperados
`describe('RF-005 …')` con las columnas nuevas, `describe('RF-031 filtro de etiquetas')` con selección múltiple y quitar chips, y `describe('RF-009 vista personal')` con la etiqueta fija del freelance. Con MSW. En el backend, `tests/api/test_clientes.py`: `test_rf031_alta_rechaza_mas_de_20_etiquetas`, `test_rf031_alta_rechaza_etiqueta_de_mas_de_80_caracteres` y el borde de 20 etiquetas de 80 caracteres, que se acepta.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 8 y 39
- Notas de implementación de T-044

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/clientes.py` y `routers/clientes.py` (topes y retiro del alias)
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- El alta y la ficha (T-045 y T-046).

## Notas de implementación- **Cierre (23/10/26):**
  - **Listado:**
    - La tabla muestra el asesor y el último viaje («Destino · dd/mm/aa»), con datos de T-155.
    - Oportunidades sigue el prototipo: «—» con 0, «1 abierta» y «n abiertas». Lo decidió el orquestador a partir de un hallazgo importante de la review, y se ajustaron las 2 aserciones que fijaban «0» y «2».
  - **Filtro de etiquetas:** `FiltroEtiquetas` es un disclosure con checkboxes nativos, alimentado por `useEtiquetasClientes`.
    - Las etiquetas elegidas quedan como chips «Quitar X».
    - Se pueden elegir hasta 20.
    - Muestra los estados de carga y de error.
    - Se cierra con Escape y con un clic afuera, y tiene `aria-controls`.
  - **Freelance:** «Mis clientes» es una pastilla fija, oscura y no interactiva.
  - **Backend (venía de T-161):** `MAX_ETIQUETAS` y `MAX_LARGO_ETIQUETA` viven en `esquemas/clientes.py` y los usan `ClienteCrear`, `ClienteEditar` y el filtro. Shared exporta las mismas constantes en zod. Se retiró el alias `etiqueta` del router, el hook, el mock y el contrato; `test_contrato_m2.py` se actualizó en el rojo.
  - **Incidente:** prettier reformateó `tipos.gen.ts` y `yo.test.ts`. Se restauraron en `b8cbdb7` y se verificó que `generar` no produce diferencias.
  - **Notas para más adelante:** cuando se implemente el PATCH, `test_rf031_edicion_acepta_20_etiquetas_de_80_caracteres` tiene que pasar a esperar el éxito. Además, `ClienteEditar` no recorta espacios porque no hereda de `Entrada`.
  - **Modelos:** Sonnet en tests, verde, refactor (sin cambios) y fix; Opus en la review.
  - **Checks:** backend con 844 tests (97 % de cobertura, 99 % en negocio). Shared con 107 tests y web con 184 (92,6 %). Lint, typecheck, ruff y mypy pasan limpios.
