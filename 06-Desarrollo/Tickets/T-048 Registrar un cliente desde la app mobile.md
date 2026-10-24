---
id: T-048
titulo: Registrar un cliente desde la app mobile
modulo: M2 — Clientes
capa: mobile
estado: hecho
depende_de: [T-047, T-149]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, RF-001, RF-002, RF-003]
origen: plan
asignado: FranLucianoo
tomado_el: 24/10/26 19:34
rama: feature/T-048-registrar-un-cliente-desde-la-app-mobile
pr:
---
# T-048 Registrar un cliente desde la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra un cliente desde el teléfono, con el mismo aviso de posible duplicado que en la web.

## Criterios de aceptación
- [ ] Formulario con validación de datos mínimos.
- [ ] Aviso de posible duplicado con confirmación.
- [ ] Tras el alta se abre la ficha.

## Tests esperados
`describe('RF-002 datos mínimos mobile')`, `describe('RF-003 duplicado mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 58 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-02 Registrar cliente]]

## Archivos probables
- `src/apps/mobile/src/features/clientes/`

## Fuera de alcance
- —

## Notas de implementación
- **Sumado el 22/10/26 (DEC-0017):** incluir el usuario de Instagram del cliente como campo **opcional**. No cuenta como contacto mínimo. El contrato lo expone desde T-149.
- **Implementación (24/10/26):** `NuevoClienteMobile.tsx` en `/clientes/nuevo`, con botón «Nuevo cliente» en `ListaClientes`. Valida con `esquemaAltaCliente` y crea el cliente con `useCrearCliente`. El rol sale de `useYo`: el `freelance` no ve el selector de asesor. Un 409 muestra los candidatos, con «Ir al cliente existente» y «Confirmar alta». Este último manda los valores actuales del formulario. Mobile no tiene react-hook-form, así que los campos usan refs, igual que el login.
- **Desvíos del prototipo (pantalla 58):**
  - Un solo campo `contacto`, como en el contrato y en la web.
  - El segmento se elige con chips.
  - El botón dice «Registrar cliente».
- **Refactor:** `VolverAClientes.tsx` reemplaza el botón Volver que estaba repetido en la ficha y en el alta.
- **Review (opus):** 0 bloqueantes, 1 importante y 3 menores. Se arreglaron en `fda7c5f`:
  - Dos tests nuevos, autorizados: el asesor elegido se envía y su error 422 se muestra.
  - Un aviso genérico cuando un 403 o un 409 llegan sin `detail`.
  - El campo de contacto usa el teclado por defecto.
- **Menor que queda pendiente:** si se edita el formulario después del aviso de duplicado, «Confirmar alta» no vuelve a pasar por el chequeo del servidor. La web se comporta igual desde T-045.
- **Modelos:** sonnet en los tests, la implementación y el refactor; opus en la review. No hubo escalados.
