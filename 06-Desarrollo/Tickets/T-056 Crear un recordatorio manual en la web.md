---
id: T-056
titulo: Crear un recordatorio manual en la web
modulo: M3 — Alertas
capa: web
estado: hecho
depende_de: [T-055]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-28, RF-080, RF-081, RF-082]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 19:25
rama: feature/T-056-crear-un-recordatorio-manual-en-la-web
pr:
---
# T-056 Crear un recordatorio manual en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la agenda (o desde un cliente, oportunidad o viaje) se crea un recordatorio y se edita mientras está pendiente.

## Criterios de aceptación
- [x] Formulario con descripción, fecha y asociación opcional.
- [x] Edición de un recordatorio pendiente.
- [x] Errores del servidor en sus campos.

## Tests esperados
`describe('RF-080 recordatorio')`, `describe('RF-082 edición')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 6 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-28 Crear recordatorio manual]]

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
- **Implementación (25/10/26):** `FormularioRecordatorio`, en `features/alertas/`, sirve para crear y para editar.
  - **Campos:** descripción, fecha y una asociación opcional.
  - **Asociación:** si el formulario se abre desde la ficha del cliente, el cliente queda fijo («Asociado a: …»). Desde la agenda hay un selector «Personal / Cliente» con buscador (`AsociarCliente`, sobre `useClientes({buscar})`). Viaje y oportunidad se suman cuando tengan su pantalla.
  - **Validación y errores:** usa `esquemaRecordatorio`. Los 422 se muestran en cada campo y los 409 y 403 en un aviso.
  - **En la agenda:** está el botón «Nuevo recordatorio» y se habilitó «Crear recordatorio» en el estado vacío. «Editar» aparece solo en un recordatorio manual, pendiente y propio.
  - **Foco y aviso:** al abrir, el foco va a Descripción; al cerrar, vuelve al botón que lo abrió (`lib/useVolverFoco.ts`). Al guardar aparece «Recordatorio creado/actualizado para el dd/mm/aa».
- **Cambio transversal:** `aplicarErroresDelServidor` (`lib/errores.ts`) ahora muestra ante un 404 el texto fijo «Lo que querés guardar ya no existe o no lo podés ver.», en lugar del mensaje genérico. El `detail` técnico del backend no se muestra. Afecta a los 9 formularios que usan el helper.
- **Desvíos del prototipo (pantalla 6):** el formulario es una tarjeta dentro de la página, no un modal (no hay `Dialog` en `components/ui`), y la fecha arranca vacía. La review sugirió precargar hoy, pero eso choca con un test del rojo y es menor, así que quedó como pendiente.
- **Review (opus):** 0 bloqueantes, 3 importantes y 3 menores. Se arreglaron todos menos la fecha precargada.
  - Importantes: faltaba asociar desde la agenda, no se manejaba el foco y no había test de la ficha.
  - Menores: el 404 técnico y la falta de aviso al guardar.
- **Modelos:** sonnet en tests, implementación y refactor; opus en la review. No hubo escalados.
