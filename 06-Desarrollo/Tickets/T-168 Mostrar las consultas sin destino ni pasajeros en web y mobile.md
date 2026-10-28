---
id: T-168
titulo: Mostrar las consultas sin destino ni pasajeros en web y mobile
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: tomado
depende_de: [T-167, T-069]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, RF-013, DEC-0023]
origen: hallazgo T-069
asignado: palomap2003
tomado_el: 28/10/26 16:38
rama: feature/T-168-mostrar-las-consultas-sin-destino-ni-pas
pr:
---
# T-168 Mostrar las consultas sin destino ni pasajeros en web y mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La pantalla de nueva consulta deja registrar una oportunidad solo con cliente y canal. Las pantallas que muestran el destino o los pasajeros indican «Destino a definir» o «—» cuando faltan. Esto vale para la tarjeta y el detalle de la oportunidad, el historial del cliente en web y en mobile, y el aviso de oportunidad abierta. Aplica [[DEC-0023 Datos mínimos de la consulta|DEC-0023]].

## Criterios de aceptación
- [ ] `esquemaConsulta` deja opcionales el destino y los pasajeros. Una consulta sin esos datos se registra igual.
- [ ] La tarjeta, el detalle y el historial (web y mobile) muestran «Destino a definir» o «—» cuando falta el dato.
- [ ] Si al emitir una cotización llega el 409 por falta de destino o de pasajeros, se muestra el motivo.
- [ ] Desde el detalle de la oportunidad se pueden completar el destino y los pasajeros (`PATCH /oportunidades/{id}`), con las mismas validaciones que al crear. Una vez cargados no se vacían. *(Se sumó el 28/10/26 por un hallazgo importante de la review, con la decisión de Paloma: sin esto, una consulta registrada solo con cliente y canal no se podía cotizar nunca desde la web.)*

## Tests esperados
Se ajustan los tests de RF-013 de `NuevaConsulta.test.tsx` y se suman `describe('RF-013 consulta sin destino')` en la web y un test equivalente en el historial mobile.

## Contexto (leer solo esto)
- [[DEC-0023 Datos mínimos de la consulta|DEC-0023]]
- `src/apps/web/src/features/oportunidades/` (T-069, T-070, T-071 y T-072)
- `src/apps/mobile/src/features/clientes/HistorialClienteMobile.tsx`

## Archivos probables
- `src/packages/shared/src/esquemas/`
- `src/apps/web/src/features/oportunidades/` y `features/clientes/`
- `src/apps/mobile/src/features/clientes/`

## Fuera de alcance
- El backend, que va en T-167.

## Notas de implementación
