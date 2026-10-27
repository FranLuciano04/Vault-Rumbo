---
id: T-060
titulo: Probar de punta a punta la agenda de alertas
modulo: M3 — Alertas
capa: e2e
estado: hecho
depende_de: [T-053, T-054, T-055, T-056, T-025, T-164, T-166]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, CU-28]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 21:35
rama: feature/T-060-probar-de-punta-a-punta-la-agenda-de-ale
pr:
---
# T-060 Probar de punta a punta la agenda de alertas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La agenda funciona contra el sistema real y la semilla de demo suma recordatorios ficticios.

## Criterios de aceptación
- [x] Un empleado crea un recordatorio, lo ve en la agenda y lo resuelve; el progreso del día cambia.
- [x] Posponer mueve la alerta a próximas.
- [x] La admin ve la agenda de toda la agencia con responsables.

## Tests esperados
`e2e/alertas.spec.ts`: `RF-080 crear recordatorio`, `RF-076 resolver`, `RF-077 posponer`, `RF-078 agenda de la agencia`.

## Contexto (leer solo esto)
- [[CU-14 Ver y atender alertas del día]]
- [[CU-28 Crear recordatorio manual]]

## Archivos probables
- `src/apps/web/e2e/alertas.spec.ts`
- `src/backend/rumbo/datos/semillas/alertas.py`

## Fuera de alcance
- Mobile: prueba manual guiada en la barrera.

## Notas de implementación
- **E2e** (`src/apps/web/e2e/alertas.spec.ts`): 5 tests contra el Compose real, todos verdes en la primera corrida útil (sin bugs del sistema). Cada test crea su empleado y su admin por la API con sufijo único, así que no depende de la semilla.
- **Semilla de demo** (`semillas/alertas.py`): 6 recordatorios manuales «Demo:» (−2, −1, 0, 0, +3 y +5 días) entre la empleada y la freelance de demo, 3 asociados a clientes de la semilla del mismo asesor. Idempotente por descripción + responsable. Se hizo con TDD aparte (`tests/negocio/test_semilla_alertas.py`). El mínimo de 5 y que sean solo manuales los fijó el test-writer; el ticket no lo decía.
- Las fechas de demo quedan fijas desde el día en que corre la semilla; volver a correrla no las renueva (documentado en el docstring).
- **Review (opus):** 0 bloqueantes, 1 importante y 3 menores, todos arreglados:
  - la semilla usaba `select` directos: ahora usa `RepositorioUsuarios.buscar_por_email` y dos métodos nuevos, `RepositorioClientes.buscar_por_contacto` (clave canónica, el más antiguo si hay varios) y `RepositorioAlertas.existe_de_propietario`. Test nuevo con el teléfono en otro formato (verificado en rojo contra la versión anterior);
  - el filtro por responsable de RF-078 ahora prueba algo (la admin tiene su propia alerta) y `HOY` se calcula una vez por test.
- Sin refactor: la capa e2e no lo tiene y la semilla es chica.
- **Modelos:** tests sonnet, implementación sonnet, review opus (sin escalado).
