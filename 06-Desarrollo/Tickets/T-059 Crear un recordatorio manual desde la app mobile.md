---
id: T-059
titulo: Crear un recordatorio manual desde la app mobile
modulo: M3 — Alertas
capa: mobile
estado: hecho
depende_de: [T-057]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-28, RF-080]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 20:20
rama: feature/T-059-crear-un-recordatorio-manual-desde-la-ap
pr:
---
# T-059 Crear un recordatorio manual desde la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la agenda del teléfono se crea un recordatorio con descripción y fecha.

## Criterios de aceptación
- [x] Formulario con validación.
- [x] Asociación opcional a un cliente.
- [x] El recordatorio aparece en la agenda.

## Tests esperados
`describe('RF-080 recordatorio mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 56 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-28 Crear recordatorio manual]]

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
- **Fecha con selector de calendario** (pedido de Paloma durante el rojo): `@react-native-community/datetimepicker@9.2.1`, la versión de Expo SDK 58. Dependencia nueva aprobada por la persona. **Tiene parte nativa: hay que reconstruir el dev client** (`expo run:android`). Se usa la API 9.x (`onValueChange`/`onDismiss`); en iOS, `display="inline"`. La fecha se muestra dd/mm/aa y viaja como `aaaa-mm-dd`.
- El rojo se rehízo en un segundo commit `test(T-059)` (c546ce6) al cambiar de campo de texto a selector.
- **Review (opus):** 0 bloqueantes, 6 importantes y 4 menores; arreglados todos en e604f75, con autorización para corregir el test (`--tocar-tests`):
  - un recordatorio con fecha futura no aparecía en la agenda del día sin aviso: ahora vuelve con «Recordatorio creado para el dd/mm/aa» y el formulario muestra la ayuda del prototipo. El backend falso del test filtra `fecha <= hoy` como el real;
  - el mock del selector no reproducía la cancelación de Android; migrado a la API nueva;
  - debounce de la búsqueda de cliente: `useDebouncedValue` pasó de la web a `@rumbo/shared/hooks`; `avisoRecordatorio` también pasó a shared;
  - al guardar se usa `router.dismissTo`, sin dos agendas apiladas;
  - `Opcion` y `MensajeError` se extrajeron a `mobile/src/componentes/` (también los usa `NuevoClienteMobile`).
- Queda para probar en un teléfono: el selector en iOS (no se verificó en dispositivo). `ListaClientes` mobile conserva su `setTimeout` propio porque además reinicia la página.
- **Modelos:** tests sonnet, implementación sonnet, refactor sonnet, review opus (sin escalado).
