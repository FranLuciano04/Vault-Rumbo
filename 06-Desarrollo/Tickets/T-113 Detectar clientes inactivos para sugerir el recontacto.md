---
id: T-113
titulo: Detectar clientes inactivos para sugerir el recontacto
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: hecho
depende_de: [T-110, T-042, T-029]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-30, RF-027, RF-028, RF-030]
origen: plan
asignado: palomap2003
tomado_el: 02/11/26 21:44
rama: feature/T-113-detectar-clientes-inactivos-para-sugerir
pr:
---
# T-113 Detectar clientes inactivos para sugerir el recontacto

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada noche se detectan los clientes fieles sin actividad hace `recontacto_meses` y se genera una alerta `recontacto` para su asesor, salvo que el cliente no quiera ser recontactado.

## Criterios de aceptación
- [ ] Criterio de «cliente fiel inactivo» exactamente como lo define CU-30 / RF-027, con el parámetro `recontacto_meses`.
- [ ] Excluye a los clientes con `no_recontactar` (RF-030) y a los que ya tienen una sugerencia pendiente.
- [ ] Sin candidatos no crea nada (A4); idempotente.

## Tests esperados
`tests/negocio/test_jobs_recontacto.py`: `test_rf027_detecta_inactivo`, `test_rf028_alerta_al_asesor`, `test_rf030_excluye_opt_out`, `test_sin_candidatos`, `test_idempotente`.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — `recontacto_meses`

## Archivos probables
- `src/backend/rumbo/negocio/servicios/proceso_diario.py`
- `src/backend/rumbo/negocio/servicios/clientes.py`

## Fuera de alcance
- La decisión sobre la sugerencia (ticket siguiente).

## Notas de implementación
- **Criterio (confirmado por Paloma, 02/11/26):** la actividad es la mayor `fecha_regreso` de los viajes no cancelados (borde inclusivo con `recontacto_meses`; un viaje futuro o en curso cuenta). Una Oportunidad abierta (`nueva`, `en_gestion`, `cotizada`) saca al cliente de la lista; una ganada o perdida no. Basta un viaje: los recurrentes solo se priorizan (CU-30).
- **Implementación:** paso `recontacto` registrado de forma explícita en `PASOS`. Los candidatos salen de una sola consulta (`RepositorioClientes.inactivos_para_recontacto`), que excluye `no_recontactar` y las alertas `recontacto` pendientes o vistas. La alerta va al asesor activo o, si no tiene, al admin activo más antiguo. La descripción es fija, sin datos del cliente (nota de T-052).
- **Pendiente de T-110 resuelto:** en lugar de un lock global en `correr()`, cada paso toma un `pg_advisory_xact_lock` dentro de su transacción (depende de READ COMMITTED, comentado en `bloquear_paso`).
- **Review de seguridad (Sonnet):** 0 bloqueantes, 1 importante y 6 menores. El importante (la alerta va al admin si el asesor está de baja) lo fija CU-30, así que no hubo cambios. Menores arreglados: el detalle avisa los clientes sin asesor ni admin activo (con un test nuevo, autorizado), y se aclararon el bloqueo, `crear_varias` y la sugerencia pospuesta.
- **Menores pendientes:** un índice único parcial que impida dos alertas `recontacto` abiertas por cliente (necesita migración; hoy lo cubre el lock). Priorizar a los recurrentes (≥ 2 viajes, RF-027) no tiene dónde mostrarse todavía: candidato a ticket aparte.
- **Modelos:** tests Sonnet, implementación y refactor Opus (el refactor no cambió nada), review Sonnet. Sin escalados.
- **De la review de T-052 (25/10/26):** la `descripcion` de una alerta no pasa por el filtro de visibilidad. Si se reasigna un cliente o un viaje, el contexto deja de mostrarle esos datos al freelance, pero el texto le sigue llegando. Por eso las alertas que se generan solas no ponen en la `descripcion` datos del origen, como el nombre del cliente o un monto: esos datos ya van en `contexto`. También se puede hacer que, al reasignar, se muevan las alertas abiertas.
