---
name: cerrar-modulo
description: Barrera de revisión de un módulo de implementación de Rumbo. Prepara el pedido de review para Codex, arregla sus hallazgos confirmados en ramas fix/ (DEC-0019) y, con la aprobación del equipo, cierra el módulo con el tag mod-N. Usar cuando alguien pida cerrar o revisar el módulo MN, o diga que Codex ya terminó su review.
---

# Cerrar un módulo

Proceso en `06-Desarrollo/Flujo de implementación.md` (DEC-0014). El módulo `MN` se cierra con el tag `mod-N`. Hay dos fases, según exista o no `06-Desarrollo/Reviews/MN — review Codex.md`.

## Fase A: preparar la review (todavía no hay review de Codex)
1. `node 06-Desarrollo/herramientas/tickets.mjs modulo MN`. Si hay tickets sin terminar (incluidos los e2e del módulo), listarlos y parar.
2. Escribir `06-Desarrollo/Reviews/MN — pedido de review.md`:
   - Encabezado `tipo: referencia`, `estado: formalizado`, `responsable: equipo`.
   - Tickets del módulo, con enlace y trazabilidad (CU y RF).
   - **Merges** de cada ticket: hash y título, tal como los da el script.
   - Archivos tocados por el módulo: la unión de `git diff --stat <merge>^1 <merge>` de cada merge.
   - Puntos que conviene mirar entre tickets: contratos entre backend, web y mobile; permisos; transacciones; migraciones.
3. Commit `review: pedido de review de MN` y push a `main`.
4. Decirle a la persona, textual, qué pedirle a Codex (desde la raíz del repo):
   > Leé `06-Desarrollo/Review de módulo — rol de Codex.md` y revisá el módulo MN según `06-Desarrollo/Reviews/MN — pedido de review.md`.

## Fase B: procesar la review (Codex ya escribió `MN — review Codex.md`)
1. Leer los hallazgos. **Verificar cada uno** contra el código. Si son muchos, lanzar `reviewer-ticket` con `model: sonnet` solo para confirmarlos. Anotar el resultado en la sección «Triage de Claude» del mismo archivo: confirmado o descartado, con el motivo.
   - Para cada hallazgo confirmado, anotar su **alcance**: la lista cerrada de comportamientos que el arreglo tiene que fijar, cada uno verificable con un test (por ejemplo, «`POST /destinos` con nombre repetido → 409»). Es el criterio de terminado del arreglo y de su review. Lo que aparezca fuera de esa lista se anota como menor y se le consulta a la persona.
2. Cada hallazgo **bloqueante** o **importante** confirmado **se arregla directamente, sin crear un ticket** (DEC-0019):
   - En una rama `fix/MN-<hallazgo>` desde `main`, con los pasos de `/implementar-ticket`: test que reproduce la falla (`test-writer`), arreglo (`implementador` de la capa, en modo fix), review con un modelo distinto, checks completos y PR. Cada fase se cierra con `tickets.mjs fase fix/MN-<hallazgo> <fase> …`, que toma la rama como identificador, y el PR se abre con `/pr` en su variante para ramas `fix/`.
   - Si toca auth, permisos, dinero, estados o el proceso diario, la review la hace `reviewer-seguridad` y el PR necesita la aprobación de otro integrante.
   - Se pueden agrupar varios hallazgos chicos de la misma zona en una misma rama.
   - Los **menores** se le consultan a la persona.
3. Anotar en «Triage de Claude» el PR de cada hallazgo arreglado. Commit `review: triage de Codex en MN` y push a `main`.
4. **Cierre**, cuando todos los tickets del módulo estén `hecho` y los PR de los hallazgos estén mergeados:
   1. Pedir la **aprobación humana** del módulo (la del equipo, o la de quien lo pida en nombre del equipo).
   2. Con la aprobación, `git checkout main && git pull --ff-only origin main`, `git tag -a mod-N -m "Módulo MN cerrado"` y `git push origin mod-N`.
   3. `tickets.mjs publicar-grafo`.
   4. Una entrada en `06-Desarrollo/Bitácora técnica.md` con el resumen del módulo: qué quedó, tickets, hallazgos de Codex y decisiones tocadas.
   5. Una línea en `00-Inicio/Estado del proyecto.md`. Commit y push.

## No hacer
- No cerrar un módulo sin la review de Codex ni sin la aprobación humana.
- No descartar un hallazgo sin haberlo verificado en el código.
- No editar la sección de hallazgos que escribió Codex: el triage va en su propia sección.
