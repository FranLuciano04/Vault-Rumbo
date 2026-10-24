---
id: T-037
titulo: Gestionar operadores en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: tomado
depende_de: [T-036]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [CU-31, RF-093, RF-094, RF-095, RF-096, CU-25, RF-147]
origen: plan
asignado: palomap2003
tomado_el: 24/10/26 11:35
rama: feature/T-037-gestionar-operadores-en-la-web
pr:
---
# T-037 Gestionar operadores en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña gestionan el catálogo de operadores desde su pestaña, con el mismo patrón que destinos.

## Criterios de aceptación
- [ ] Listado, alta, edición, baja y reactivación.
- [ ] Duplicados (409) mostrados en el formulario.
- [ ] Sigue los componentes del ABM de destinos.

## Tests esperados
`describe('RF-093 operadores')`, `describe('RF-094 duplicado')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 33 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-31 Gestionar operadores]]
- El código web de destinos como patrón

## Archivos probables
- `src/apps/web/src/features/configuracion/operadores/`

## Fuera de alcance
- —

## Notas de implementación
- **Sumado el 24/10/26 (Francisco; pendiente de T-035, se absorbe acá en vez de abrir un subticket):** permitir corregir el `nombre` al editar un usuario (CU-25 A2, RF-147). El backend ya lo acepta desde T-028 (`UsuarioEditar.nombre`).
  - En `features/configuracion/usuarios/FormularioUsuario.tsx`, habilitar el campo Nombre al editar. El email sigue bloqueado, porque identifica la cuenta de Firebase.
  - En `features/configuracion/esquemas.ts`, `esquemaEdicionUsuario` valida el nombre con la misma regla del alta (no vacío).
  - El PATCH lo manda solo si cambió (`dirtyFields`, como el resto).
  - Test en `PestanaUsuarios.test.tsx`: se corrige el nombre y el PATCH lleva solo `nombre`; un nombre vacío no se envía.
