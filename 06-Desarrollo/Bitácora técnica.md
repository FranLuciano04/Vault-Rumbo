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

### 23/10/26 — Nahuel (con el equipo) — M0 Fundaciones cerrado (`mod-0`)
- **Qué quedó:**
  - Backend FastAPI con PostgreSQL, sesión async, modelos del ER y migración inicial desde `rumbo.sql`.
  - Errores problem+json.
  - Autenticación con Firebase: verificación del token y `GET /api/auth/yo` con el rol.
  - Visibilidad por fila según el rol y auditoría `created_by`/`updated_by`.
  - Cliente de IA con modelo falso y CLI de datos iniciales.
  - Contrato y tipos compartidos en `@rumbo/shared`.
  - Shells web y mobile con inicio de sesión por email o Google.
  - CI con filtros por carpeta, análisis de seguridad y auditoría semanal.
  - Compose de desarrollo, de e2e y de producción local; e2e del login web.
- **Tickets:** 38, de T-001 a T-025 más los de hallazgos (T-140 a T-145, T-150, T-152, T-154, T-162) y los de la review de Codex (T-158, T-159, T-160). Detalle y merges en [[M0 — pedido de review]].
- **Review de Codex** ([[M0 — review Codex]]): 3 hallazgos, todos confirmados en el triage.
  - H-01 → T-158 (PR #51): la config de Firebase de mobile no llegaba al bundle de Expo porque se leía con un alias de `process.env`.
  - H-02 → [[DEC-0018 Revocación de sesiones de Firebase|DEC-0018]] y T-159 (PR #53): se acepta la ventana de 1 h sin `check_revoked`, y un test impide activarlo sin una decisión nueva.
  - H-03 → T-160 (PR #55): el CI corre mobile cuando cambia `shared`.
- **Pendientes que no bloquean:**
  - probar el inicio de sesión en el development build con un `.env` real;
  - si se edita `openapi.json` a mano sin tocar el backend, no corre el job `backend` (menor de T-160);
  - el `PermissionError` de `tmp_path` de pytest en la PC de Nahuel.
- **Decisiones tocadas:** [[DEC-0001 Stack tecnológico]], [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]], [[DEC-0011 Infraestructura de despliegue on-premise]], [[DEC-0012 Modelo de IA del producto]], [[DEC-0013 Datos que faltaban en el ER]], [[DEC-0014 Flujo de implementación con agentes]], [[DEC-0015 Decisiones de implementación]], [[DEC-0016 Autenticación con Firebase]], [[DEC-0018 Revocación de sesiones de Firebase]].
- Aprobación del equipo: 23/10/26. Tag `mod-0` sobre `d57e8f2`.
