---
id: T-136
titulo: Publicar Rumbo con Cloudflare Tunnel
modulo: M10 — Despliegue on-premise
capa: infra
estado: libre
depende_de: [T-135]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, DEC-0016]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-136 Publicar Rumbo con Cloudflare Tunnel

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Rumbo se accede por HTTPS desde fuera de la agencia a través de Cloudflare Tunnel, sin abrir puertos.

## Criterios de aceptación
- [ ] Servicio `cloudflared` en el Compose con el token en el `.env`.
- [ ] El dominio sirve la web y la API por HTTPS.
- [ ] El dominio queda autorizado en Firebase para el login.

## Tests esperados
No sigue TDD (`infra`). Se verifica entrando desde una red externa y desde el teléfono.

## Contexto (leer solo esto)
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]
- [[DEC-0016 Autenticación con Firebase|DEC-0016]] — dominios autorizados

## Archivos probables
- `src/docker-compose.yml`
- `src/infra/servidor.md`

## Fuera de alcance
- —

## Notas de implementación
