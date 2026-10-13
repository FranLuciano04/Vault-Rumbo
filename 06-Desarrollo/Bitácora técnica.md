---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---
# Bitácora técnica

tags:: #tipo/referencia

> Registro **append-only** de la fase de desarrollo (PC2+). Entradas fechadas por autor; no se reescribe lo anterior. Vincula avances de código con decisiones del vault.

## Formato de entrada
```
### dd/mm/aa — <Autor>
- <Qué se hizo> (rama `feature/...`, commit `<hash>`)
- Decisiones tocadas: [[DEC-####]]
```

---

### 12/10/26 — Nahuel
- Se definió el proceso de implementación: [[Flujo de implementación]], con skills, subagentes y `06-Desarrollo/herramientas/tickets.mjs` (semáforo y grafo). Todavía no hay código: el próximo paso es la spec y el plan con los tickets. Desde ahora, una entrada por módulo cerrado.
- Decisiones tocadas: [[DEC-0014 Flujo de implementación con agentes]], [[DEC-0001 Stack tecnológico]] (estructura en `src/`).
