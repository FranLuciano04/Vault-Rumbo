---
id: T-135
titulo: Preparar el servidor on-premise de la agencia
modulo: M10 — Despliegue on-premise
capa: infra
estado: libre
depende_de: [T-024]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, RNF-13]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-135 Preparar el servidor on-premise de la agencia

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El servidor de la agencia queda listo para correr Rumbo con Docker: usuario de servicio, firewall sin puertos abiertos, `.env` con los secretos fuera del repo y un runbook.

## Criterios de aceptación
- [ ] Docker instalado y Rumbo levantado con el Compose de producción.
- [ ] Sin puertos expuestos a internet (el acceso entra por el túnel).
- [ ] `src/infra/servidor.md` documenta instalación, actualización y recuperación.

## Tests esperados
No sigue TDD (`infra`). Se verifica levantando el Compose en el servidor y con un escaneo de puertos.

## Contexto (leer solo esto)
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]
- [[ARQ — Vista general]] — «Vista de despliegue»

## Archivos probables
- `src/infra/servidor.md`

## Fuera de alcance
- El túnel y el respaldo (tickets propios).

## Notas de implementación
- **Del plan:** Necesita a una persona con acceso al servidor (pregunta abierta de la spec §10: cuándo y dónde está disponible).
