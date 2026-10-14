---
id: T-134
titulo: Probar de punta a punta la planificación de redes
modulo: M9 — Redes e IA
capa: e2e
estado: libre
depende_de: [T-131, T-133, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, CU-20]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-134 Probar de punta a punta la planificación de redes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Redes funciona contra el sistema real con la IA falsa del Compose de e2e, y la semilla de demo suma piezas ficticias.

## Criterios de aceptación
- [ ] Crear una pieza, moverla por el tablero y descartarla.
- [ ] Pedir una propuesta (modelo falso) y guardarla como pieza.
- [ ] Un usuario sin acceso a redes no ve la sección.

## Tests esperados
`e2e/redes.spec.ts`: `RF-113`, `RF-114`, `RF-119`, `RF-121`.

## Contexto (leer solo esto)
- [[CU-19 Planificar contenido en redes]]
- [[CU-20 Generar propuesta de contenido con IA]]

## Archivos probables
- `src/apps/web/e2e/redes.spec.ts`
- `src/backend/rumbo/datos/semillas/redes.py`

## Fuera de alcance
- La IA real (nunca en e2e ni en el CI).

## Notas de implementación
