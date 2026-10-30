---
id: T-105
titulo: Cambiar el estado del viaje en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-102]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-08, RF-039, RF-042]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 11:26
rama: feature/T-105-cambiar-el-estado-del-viaje-en-la-web
pr:
---
# T-105 Cambiar el estado del viaje en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la ficha se pasa el viaje a en curso o finalizado, con la confirmación del prototipo, y se corrige un estado cargado por error.

## Criterios de aceptación
- [ ] Acciones disponibles según EST-Viaje.
- [ ] Confirmación del cambio (pantalla 16).
- [ ] Corrección al estado anterior.

## Tests esperados
`describe('RF-039 avanzar estado')`, `describe('RF-042 corregir')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 16 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-08 Gestionar estado del viaje]]
- [[EST-Viaje]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- —

## Notas de implementación
- **Implementación (30/10/26, Francisco):**
  - `AccionesDelViaje.tsx` es nuevo y va en la región «Acciones» de la ficha.
    - «Pasar a en curso» aparece solo en `confirmado`, «Pasar a finalizado» solo en `en_curso` y «Corregir estado» en `en_curso` y `finalizado` (T7).
    - Cada acción abre un diálogo inline con los textos de la pantalla 16. Al corregir, se hace un POST sin cuerpo, porque el contrato no pide motivo.
  - **Permiso:** igual que el backend (`_escribe_operacion`): admin, dueño o el responsable del viaje, cualquiera sea su rol. No depende de `editable`, porque `editable` excluye `finalizado`.
  - Review (Opus), en dos rondas.
    - **1 bloqueante:** la web decidía por rol (`rol !== "freelance"`), así que el freelance responsable no veía las acciones y el empleado que no es responsable recibía 403.
    - **2 importantes:** el texto de un «historial del viaje» que no existe y un JSDoc que decía que se valida la fecha de regreso.
    - **1 menor:** se podía cancelar durante el POST.
    - En la segunda ronda se agregó el caso del empleado que no es responsable.
    - Con autorización, se reemplazaron los tests del freelance que fijaban la regla vieja.
  - El texto para finalizar («…si el viaje realmente terminó. Si se extendió, dejalo como está.») sale por analogía con la pantalla 16, que solo muestra iniciar.
  - Modelos: tests, implementación y fix con Sonnet; refactor con Sonnet (sin cambios); review con Opus.
