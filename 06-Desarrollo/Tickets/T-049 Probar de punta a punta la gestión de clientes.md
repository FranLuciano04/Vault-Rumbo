---
id: T-049
titulo: Probar de punta a punta la gestión de clientes
modulo: M2 — Clientes
capa: e2e
estado: hecho
depende_de: [T-040, T-041, T-042, T-043, T-045, T-046, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-003, RF-151]
origen: plan
asignado: FranLucianoo
tomado_el: 24/10/26 15:42
rama: feature/T-049-probar-de-punta-a-punta-la-gestion-de-cl
pr:
---
# T-049 Probar de punta a punta la gestión de clientes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los flujos de clientes funcionan contra el sistema real y la semilla de demo suma clientes ficticios.

## Criterios de aceptación
- [x] Alta con aviso de duplicado y confirmación.
- [x] Un `freelance` no ve el cliente de otro (404) y sí los suyos.
- [x] Edición inválida rechazada; semilla de demo de clientes registrada.

## Tests esperados
`e2e/clientes.spec.ts`: `RF-003 posible duplicado`, `RF-151 visibilidad del freelance`, `RF-007 edición`.

## Contexto (leer solo esto)
- [[CU-02 Registrar cliente]]
- [[CU-03 Gestionar ficha del cliente]]
- [[Spec de implementación]] §6

## Archivos probables
- `src/apps/web/e2e/clientes.spec.ts`
- `src/backend/rumbo/datos/semillas/clientes.py`

## Fuera de alcance
- Mobile: prueba manual guiada en la barrera.

## Notas de implementación
- **Implementación (24/10/26, Francisco):** `e2e/clientes.spec.ts` con tres tests: `RF-003` (alta con duplicado y «Confirmar alta»), `RF-151` (el freelance ve los suyos y recibe 404 por el de la dueña) y `RF-007` (un contacto inválido no se guarda). Los datos se preparan por la API. `elegirContrasena` pasó de `configuracion.spec.ts` a `e2e/compose.ts`, para reutilizarla. Semilla `sembrar_clientes`: 4 clientes ficticios (`@rumbo.test` y `5555-01xx`), asignados a los usuarios de demo de M1. Corre después de `sembrar_configuracion` y es idempotente por contacto.
  - **Falla arreglada en la rama (DEC-0019):** el `QueryClient` de la web reintentaba 3 veces los 4xx, y una ficha 404 tardaba unos 7 s en mostrarse. Ahora `crearQueryClient()` (`src/lib/queryClient.ts`) no reintenta un `ErrorApi` 4xx; los errores de red y los 5xx se siguen reintentando. Lo destapó el e2e de `RF-151`.
  - **Test corregido:** el primer `RF-151` creaba la cuenta en el emulador antes del `POST /usuarios`, que da 409 con `CuentaYaExiste`. Al mover el helper faltó importar `expect`, y se agregó.
  - **Review (Opus):** 0 bloqueantes, 0 importantes y 3 menores, que quedan anotados:
    - La idempotencia de la semilla depende del contacto: si se edita el contacto de un cliente de demo, se vuelve a crear.
    - `consultaYo` mantiene su propio `retry`, así que hay dos políticas de reintento.
    - Mobile sigue con `new QueryClient()`. Pasa a T-047.
  - **Modelos:** tests, semilla y fix con Sonnet; review con Opus. Sin escalados.
