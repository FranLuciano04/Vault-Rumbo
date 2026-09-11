---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---
# Claude Code — memoria del proyecto

> Resumen **lean** del proyecto. El `CLAUDE.md` de la raíz define cómo entrar en contexto y apunta a esta nota. **Fuente de verdad = este vault; `CLAUDE.md` y esta memoria son reflejos/punteros.** Mantener corto: ver por qué en [[Contexto eficiente con Claude (ahorro de tokens)]].

## Qué es Rumbo
CRM para agencias de turismo PyME. Digitaliza el circuito consulta → cotización → reserva → pagos/alertas → post-venta. Ver [[🏠 Rumbo — Home]].

## Convenciones (no negociables)
- Dominio en **español (Argentina)** con tildes; nombres de entidad = lenguaje ubicuo (`Reseña`, `Cotización`).
- Moneda **ARS** · fechas **dd/mm/aa**.
- Diagramas en **Mermaid** (texto, versionable en Git). No imágenes para diagramas de diseño.
- Comisión automática = [[RN-01 Comisión automática]].

## Stack
- Backend: FastAPI + PostgreSQL + LangChain; dependencias con uv.
- Web: React + TypeScript + Vite; TanStack Query + Axios.
- Mobile: React Native + Expo + EAS Build; comparte Query/Axios.
- Monorepo: pnpm workspaces (`apps/web`, `apps/mobile`, `packages/shared`) y `backend/` con uv.
- Contrato compartido: OpenAPI → openapi-typescript; validaciones con zod.
- Infraestructura de despliegue a definir; on-premise no está aprobado. Detalle y herramientas de calidad/pruebas: [[DEC-0001 Stack tecnológico]].

## Dominio (punteros, no copiar)
11 entidades en `03-Dominio/Entidades/`. Empezar por [[MOC — Modelo de dominio]] y bajar a la entidad puntual que se necesite.

## Fuera de alcance (no implementar)
Pagos online, publicación automática en redes, integración GDS/mayoristas, facturación (fase 2). Ver [[Alcance y fuera de alcance]].

## Cómo darme contexto sin gastar tokens
1. Pasame primero el MOC/resumen, no el vault entero.
2. Referenciá por ruta/ID (`leé DEC-0001`), dejá que abra el archivo.
3. Al terminar, volcá el resultado a [[Estado del proyecto]] o a una `DEC-`.

## Vínculo código ↔ decisiones (PC2+)
- Commits referencian el ID: `feat(pagos): comisión automática (RN-01, DEC-0001)`.
- Cada `DEC-` que cambia código anota `rama:` y `commits:`.
