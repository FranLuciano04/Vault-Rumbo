---
id: T-081
titulo: Editar un hotel del catálogo en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: hecho
depende_de: [T-080]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, RF-097, RF-098, RF-099, RF-100]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 16:16
rama: feature/T-081-editar-un-hotel-del-catalogo-en-la-web
pr:
---
# T-081 Editar un hotel del catálogo en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se da de alta un hotel, se lo edita o se lo da de baja desde la web, con el aviso de posible duplicado.

## Criterios de aceptación
- [x] Formulario con validación de datos mínimos.
- [x] Aviso de posible duplicado con confirmación.
- [x] Baja con confirmación.

## Tests esperados
`describe('RF-097 alta de hotel')`, `describe('RF-099 duplicado')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 23 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-16 Gestionar hotel en catálogo]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- —

## Notas de implementación
- **De la review de T-080 (28/10/26):** el contrato no tiene un catálogo de categorías ni de servicios. Por eso el catálogo web usa las constantes compartidas `CATEGORIAS_HOTEL` (de 1 a 5 estrellas) y `SERVICIOS_HOTEL` (los de la pantalla 21 del prototipo), que viven en `@rumbo/shared`. El alta y la edición tienen que ofrecer las mismas listas: si no, un hotel cargado con otro texto no aparece al filtrar. El contrato tampoco permite filtrar por un rango de categorías ni por varios servicios a la vez, así que la pantalla no puede ofrecer esas opciones.
- **Implementación (28/10/26):**
  - **Rutas:** `/hoteles/nuevo` (alta) y `/hoteles/:id/editar` (edición y baja).
  - **Formulario:** `FormularioHotel` es común al alta y a la edición. Pide nombre y destino; la categoría (de `CATEGORIAS_HOTEL`) y el precio son opcionales, y los servicios se eligen con chips de `SERVICIOS_HOTEL`.
  - **Freelance:** lo redirige a `/hoteles`.
  - **Baja:** `BajaDelHotel` pide confirmación con un `alertdialog` modal. Retiene el foco, se cierra con Escape y devuelve el foco al botón.
- **Decisiones:**
  - **Duplicado:** prevalece CU-16 A2 sobre el criterio «con confirmación». El 409 devuelve `existente` y se muestra el enlace «Abrir el hotel existente», sin opción de «guardar igual». `ErrorApi` (shared) suma `existente`.
  - **Precio en es-AR** («110.000» o «1.420.000,50»): hasta 12 enteros y 2 decimales. `features/hoteles/formato.ts` lo convierte antes de enviarlo y también lo usa el filtro del catálogo (T-080). «Sin precio» se distingue de 0.
  - **PATCH:** manda solo lo que cambió. Si cambia algún chip, manda la lista completa de `servicios`, y manda `null` al vaciar la categoría o el precio.
  - **Datos que no están en las listas o están dados de baja:** un destino dado de baja se muestra como «(dado de baja)», y una categoría o un servicio que no figuran en las constantes se muestran igual.
  - **Hotel cerrado:** muestra un aviso y no deja editarlo.
- **Mock corregido:** `GET /api/destinos/:id` devolvía siempre Bariloche.
- **Review (opus), dos rondas:**
  - **Primera:** 1 bloqueante (el destino dado de baja no aparecía al editar), 2 importantes (el hotel cerrado se podía editar y el formato del precio estaba duplicado y no seguía es-AR) y 6 menores. Se arreglaron todos.
  - **Segunda:** 1 importante (se confundía «sin precio» con 0 y se perdía el dato) y 2 menores (foco del diálogo). Se arreglaron todos.
- **Para T-082 (Nahuel):** la edición vive en `/hoteles/:id/editar`, así que desde el detalle conviene enlazar «Editar» ahí. Hoy solo se llega a la edición por URL.
- **Modelos:** sonnet en tests e implementación; opus en la review.
