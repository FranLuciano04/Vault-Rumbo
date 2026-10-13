---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 12/10/26
---
# Claude Code — memoria del proyecto

> Resumen **lean** del proyecto. El `CLAUDE.md` de la raíz define cómo entrar en contexto y apunta a esta nota. **Fuente de verdad = este vault; `CLAUDE.md` y esta memoria son reflejos/punteros.** Mantener corto: ver por qué en [[Contexto eficiente con Claude (ahorro de tokens)]].

## Qué es Rumbo
CRM para agencias de turismo PyME. Digitaliza el circuito consulta → cotización → reserva → pagos/alertas → post-venta. Ver [[🏠 Rumbo — Home]].

## Convenciones (no negociables)
- Dominio en **español (Argentina)** con tildes; nombres de entidad = lenguaje ubicuo (`Reseña`, `Cotización`).
- Moneda **ARS** · fechas **dd/mm/aa**. La economía del [[Viaje]] es **multimoneda (ARS/USD)** por operación — ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].
- Diagramas en **Mermaid** (texto, versionable en Git). No imágenes para diagramas de diseño. Notación de **actividad** y de **secuencia**: [[DEC-0010 Notación de los diagramas de actividad y de secuencia]].
- Comisión automática = [[RN-01 Comisión automática]].

## Stack
- Backend: FastAPI + PostgreSQL + LangChain; SQLAlchemy 2.0 async + Alembic; dependencias con uv. Arquitectura en tres capas + `core`: [[ARQ — Vista general]].
- Web: React + TypeScript + Vite; TanStack Query + Axios.
- Mobile: React Native + Expo + EAS Build; comparte Query/Axios.
- Monorepo dentro de `src/`: pnpm workspaces (`src/apps/web`, `src/apps/mobile`, `src/packages/shared`) y `src/backend/` con uv.
- Contrato compartido: OpenAPI → openapi-typescript; validaciones con zod.
- Autenticación: **Firebase Authentication** (email y Google); rol, permisos y auditoría en Rumbo, ver [[DEC-0016 Autenticación con Firebase]].
- Infraestructura: servidor **on-premise** con Docker Compose y Cloudflare Tunnel, ver [[DEC-0011 Infraestructura de despliegue on-premise]]. IA del producto: Claude Sonnet 5.5, ver [[DEC-0012 Modelo de IA del producto]]. Calidad y pruebas: [[DEC-0001 Stack tecnológico]].

## Dominio (punteros, no copiar)
13 entidades en `03-Dominio/Entidades/`. Empezar por [[MOC — Modelo de dominio]] y bajar a la entidad puntual que se necesite.

## Fuera de alcance (no implementar)
Pagos online, publicación automática en redes, integración GDS/mayoristas, facturación (fase 2). Ver [[Alcance y fuera de alcance]].

## Cómo darme contexto sin gastar tokens
1. Pasame primero el MOC/resumen, no el vault entero.
2. Referenciá por ruta/ID (`leé DEC-0001`), dejá que abra el archivo.
3. Al terminar, volcá el resultado a [[Estado del proyecto]] o a una `DEC-`.

## Vínculo código ↔ decisiones (PC2+)
- Cómo se implementa: [[Flujo de implementación]] ([[DEC-0014 Flujo de implementación con agentes|DEC-0014]]): tickets con semáforo en Git, TDD con subagentes y review de Codex por módulo. Código en `src/`.
- Commits referencian el ticket y las reglas: `feat(T-031): registrar cobro (RF-070, RN-01)`.
- Cada `DEC-` que cambia código anota `rama:` y `commits:`.
