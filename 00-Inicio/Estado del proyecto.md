---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---

# 📊 Estado del proyecto

> Memoria externa del equipo (y de Claude). Se actualiza en cada **sync semanal**. Es lo primero que se lee al retomar. Mantener **corto**.

## Fase actual
**Análisis y diseño → rumbo a PC1 (23/10/26).** Próximo: diagrama de clases, ER, actividad, arquitectura y prototipo UI.

## Roles de esta quincena
- **Coordinador de vault:** _(a asignar)_
- **Guardián del dominio:** _(a asignar)_
- **Escriba de decisiones:** _(a asignar)_

## Checklist PC1 — modelo UML completo
- [ ] `01-Relevamiento/` formalizado
- [ ] 4 actores formalizados
- [ ] Casos de uso núcleo + diagrama de casos de uso
- [ ] 10 entidades formalizadas (Usuario, Cliente, Oportunidad, Viaje, Pago, Hotel, Reseña, Alerta, Cotización, ContenidoRed)
- [ ] [[MOC — Modelo de dominio|Diagrama de clases]] + [[DGM-ER]] coherentes
- [ ] Diagramas de actividad de flujos clave
- [ ] [[ARQ — Vista general]] en revisión/formalizado
- [ ] DEC estructurales registradas

> Cierre PC1: la consulta `#pc/pc1 AND #estado/borrador` debe dar **cero** en lo de arriba.

## Bitácora de decisiones recientes
- 09/09/26 — Se adopta Claude como agente de IA (unánime). Se crea el vault y sus convenciones. Ver [[Guía del Vault]].
- 09/09/26 — Nahuel propone el stack técnico completo: FastAPI/PostgreSQL/LangChain, React y React Native, monorepo TypeScript/Python y pipeline de calidad. Queda en revisión en [[DEC-0001 Stack tecnológico]].

## Bloqueos / a decidir
- Fórmula de comisión → [[RN-01 Comisión automática]].
- Relaciones Viaje–Hotel–Reseña → [[MOC — Modelo de dominio]].
- Autenticación e infraestructura de despliegue → [[ARQ — Vista general]]. El servidor on-premise es una alternativa pendiente.
