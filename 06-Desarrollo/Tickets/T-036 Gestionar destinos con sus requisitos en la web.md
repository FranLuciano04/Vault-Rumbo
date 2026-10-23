---
id: T-036
titulo: Gestionar destinos con sus requisitos en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: hecho
depende_de: [T-034]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-26, CU-15, RF-086, RF-089, RF-090, RF-091, RF-092]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 23/10/26 15:39
rama: feature/T-036-gestionar-destinos-con-sus-requisitos-en
pr:
---
# T-036 Gestionar destinos con sus requisitos en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña gestionan el catálogo de destinos y, dentro de cada uno, sus requisitos, desde la pestaña Destinos. Es el primer ABM web: fija el patrón de tabla, formulario y baja.

## Criterios de aceptación
- [ ] Listado con filtro de inactivos, alta y edición, baja y reactivación.
- [ ] Requisitos del destino: agregar, editar y quitar.
- [ ] Duplicados (409) y validaciones (422) mostrados en el formulario.

## Tests esperados
`describe('RF-089 destinos')`, `describe('RF-090 duplicado')`, `describe('RF-086 requisitos')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 32 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-26 Gestionar destinos]]
- [[CU-15 Configurar recordatorios por destino]]

## Archivos probables
- `src/apps/web/src/features/configuracion/destinos/`

## Fuera de alcance
- Operadores (ticket propio).

## Notas de implementación
- `PestanaDestinos` (tabla + formulario en línea) con `FormularioDestino`, `RequisitosDestino` y `FormularioRequisito`; la pestaña «Destinos y requisitos» queda habilitada en `PaginaConfiguracion`.
- «Ver inactivos» manda `activo=false`, que en el backend devuelve **solo** los inactivos. Quitar requisito = baja lógica (`POST /requisitos-destino/{id}/baja`) con confirmación, porque no se puede reactivar desde la UI; la baja de destino no confirma (se revierte con «Reactivar»).
- `errores.ts` (compartido): un 409 ahora muestra su `detail` en todos los formularios de Configuración; nuevo `mensajeDeError`.
- Sin componente de paginación en `apps/web`: los listados avisan «Mostramos N de M» cuando `total > items.length`. Si se crea un paginador, adoptarlo acá.
- Review (Opus): 0 bloqueantes, 3 importantes y 5 menores, todos arreglados. Tests corregidos con autorización (`--tocar-tests`): confirmación al quitar requisito y `detail` del mock del 409.
- **Pendiente del equipo:** el prototipo (pantalla 32) es maestro-detalle (lista a la izquierda, detalle a la derecha); lo implementado es tabla con panel de requisitos debajo. No se cambió sin decisión.
- Modelos: tests sonnet, impl/refactor/fix sonnet, review opus. Sin escalados.
