---
id: T-117
titulo: Atender una sugerencia de recontacto en la app mobile
modulo: M7 — Proceso diario y CRM proactivo
capa: mobile
estado: hecho
depende_de: [T-058]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-029, RF-030]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 02/11/26 18:59
rama: feature/T-117-atender-una-sugerencia-de-recontacto-en
pr:
---
# T-117 Atender una sugerencia de recontacto en la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En el teléfono, la sugerencia de recontacto muestra el cliente y permite llamarlo o escribirle, marcarlo para no recontactar o posponer.

## Criterios de aceptación
- [ ] Detalle de la sugerencia con acceso a la ficha y al contacto.
- [ ] No recontactar y posponer.
- [ ] Crear la consulta queda para la web (aviso).

## Tests esperados
`describe('RF-030 opt-out mobile')` con MSW.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]]
- [[Prototipo UI]] — pantallas 53 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- Registrar consultas en mobile (fuera del alcance mobile).

## Notas de implementación
- `RecontactoMobile` se muestra en `DetalleAlertaMobile` para alertas `recontacto`: preferencias, acciones de contacto (`AccionesContacto`, extraído de `FichaClienteMobile` para no duplicarlo), aviso de que la consulta se crea desde la web y «No recontactar».
- Mismo orden que la web (T-116): primero el PATCH `no_recontactar`, después resolver; «Posponer» solo con la alerta `pendiente`. Si el PATCH salió bien y falla el resolver, se avisa que el cliente quedó marcado y el reintento llama solo al resolver. Con la alerta `resuelta` no se ofrece el opt-out.
- Los tests no usan MSW (no carga bajo jest-expo): siguen el adaptador falso de `detalleAlerta.test.tsx`.
- Review (opus): 1 importante y 3 menores. Arreglados: el importante y el aviso si falla la ficha. Quedan anotados: (a) el último viaje en el detalle, porque `ultimo_viaje` no está en el `Cliente` de `GET /clientes/{id}` (solo en `ClienteListado`) y «Ver cliente» ya lleva al historial; (b) en mobile el opt-out no ofrece «Deshacer», a diferencia de la web.
- Se autorizó agregar 3 casos al test del rojo (`--tocar-tests`). Modelos: tests, impl, refactor y fix sonnet; review opus. Sin escalados; el refactor no hizo cambios.
