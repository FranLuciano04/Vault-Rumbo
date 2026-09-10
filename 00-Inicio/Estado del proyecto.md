---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---

# 📊 Estado del proyecto

> Memoria externa del equipo (y de Claude). Se actualiza en cada **sync semanal**. Es lo primero que se lee al retomar. Mantener **corto**.

## Fase actual
**Análisis y diseño → rumbo a PC1 (23/10/26).** En curso: especificación de los casos de uso (repartida, ver [[MOC — Casos de uso]]). Próximo: diagrama de clases, ER, actividad, arquitectura y prototipo UI.

## Roles de esta quincena
- **Coordinador de vault:** _(a asignar)_
- **Guardián del dominio:** _(a asignar)_
- **Escriba de decisiones:** _(a asignar)_

## Checklist PC1 — modelo UML completo
> Herramientas: **diagramas UML en Mermaid** (versionable) · **prototipo UI en Figma** (MCP), con link + PNGs en [[Entregables — índice|07-Entregables]].

### Obligatorio (piso del cronograma)
- [ ] `01-Relevamiento/` formalizado
- [ ] [[Actores]] formalizados (empleado, admin, dueño, cliente)
- [ ] Especificación de los 24 CU + [[DGM — Casos de uso|diagrama de casos de uso]]
- [ ] 10 entidades formalizadas (Usuario, Cliente, Oportunidad, Viaje, Pago, Hotel, Reseña, Alerta, Cotización, ContenidoRed)
- [ ] [[MOC — Modelo de dominio|Diagrama de clases]] + [[DGM-ER]] coherentes (atributos, tipos, multiplicidades)
- [ ] Diagramas de **actividad** de flujos clave ([[CU-01 De la consulta a la venta|CU-01]] + críticos)
- [ ] [[ARQ — Vista general]] formalizada
- [ ] DEC estructurales registradas y **ratificadas** (DEC-0001→0005)
- [ ] Prototipo UI de pantallas clave (Figma)

### Recomendado (buenas prácticas — refuerzan el modelo)
- [ ] Diagramas de **secuencia** de CU clave (consulta→cotización→reserva, registrar pago)
- [ ] Diagramas de **estado**: `Viaje`, `Oportunidad`, `Pago`
- [ ] **Matriz de trazabilidad** (objetivo → CU → entidad → regla)
- [ ] Catálogo de **reglas de negocio** ampliado (hoy solo [[RN-01 Comisión automática]])

> Cierre PC1: la consulta `#pc/pc1 AND #estado/borrador` debe dar **cero** en lo obligatorio de arriba.

## Bitácora de decisiones recientes
- 10/09/26 — Se define el catálogo completo de casos de uso (24 CU + núcleo) con diagrama y se reparte la especificación entre los tres. Ver [[MOC — Casos de uso]] y [[Especificación de casos de uso — flujo]]. Nuevo flujo md-fuente / docx-derivado y sección [[Entregables — índice]].
- 10/09/26 — Francisco resuelve (en revisión, ratificar en sync): [[DEC-0003 Relación Viaje–Hotel y Reseña]] (N:M + Reseña sobre Hotel), [[DEC-0004 Comisión configurable por porcentaje]] y [[DEC-0005 Autenticación y modelo de roles]]. Confirma además el stack de [[DEC-0001 Stack tecnológico]].
- 09/09/26 — Se adopta Claude como agente de IA (unánime). Se crea el vault y sus convenciones. Ver [[Guía del Vault]].
- 09/09/26 — Nahuel propone el stack técnico completo: FastAPI/PostgreSQL/LangChain, React y React Native, monorepo TypeScript/Python y pipeline de calidad. Queda en revisión en [[DEC-0001 Stack tecnológico]].

## Bloqueos / a decidir
- **Mecanismo de autenticación** (propia y/o Google OAuth) → [[DEC-0005 Autenticación y modelo de roles]].
- **Infraestructura de despliegue** → [[ARQ — Vista general]]. El servidor on-premise es una alternativa pendiente.
- **Ratificar en la sync** DEC-0003, DEC-0004, DEC-0005 y formalizar DEC-0001.
