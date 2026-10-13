---
name: pr
description: Escribe y abre el pull request de un ticket de Rumbo con el formato fijo del proyecto (objetivo, trazabilidad, evidencia TDD, tests y cobertura, review, modelos, riesgo y checklist). La usa /implementar-ticket al cerrar cada ticket; también se puede invocar con /pr T-NNN desde la rama de un ticket.
---

# PR de un ticket

Arma la descripción con datos **reales** (del ticket, de `git log` y de las corridas de tests) y abre el PR con `gh`. Nunca inventes un número: lo que no tengas, marcalo como «no disponible».

## Antes de escribir
1. Estar en la rama del ticket (`feature/T-NNN-…`), con todo commiteado y subido (`git push`).
2. Juntar los datos:
   - **Ticket:** `06-Desarrollo/Tickets/T-NNN ….md`. Del frontmatter: `titulo`, `modulo`, `capa`, `riesgo`, `trazabilidad`, `modelo_*` y `origen`. Del cuerpo: el objetivo, los criterios y las notas de implementación.
   - **Commits del ticket:** `git log main..HEAD --format='%h %s'` → evidencia del ciclo rojo → verde → refactor → fix.
   - **Archivos:** `git diff --stat main...HEAD`.
   - **Tests y cobertura:** la salida de la última corrida (la tiene el orquestador o se vuelve a correr), con los comandos de la §4 de `06-Desarrollo/Spec de implementación.md`.
   - **Review:** el resumen de hallazgos del reviewer y qué se hizo con cada uno.

## Plantilla
Título: `T-NNN: <titulo del ticket>` (sin punto final).

Cuerpo, en un archivo temporal **fuera del repo**, pasado con `gh pr create --body-file`:

```markdown
## Objetivo
<Un párrafo: qué comportamiento existe ahora y para quién, tomado del ticket.>

**Ticket:** `06-Desarrollo/Tickets/T-NNN ….md` · **Módulo:** MN — … · **Capa:** … · **Riesgo:** normal | ⚠️ alto

## Trazabilidad
| Tipo | Referencias |
|---|---|
| Casos de uso | CU-xx (pasos o flujos alternativos que cubre) |
| Requisitos | RF-xxx, … |
| Reglas y decisiones | RN-xx, DEC-xxxx |

## Criterios de aceptación
- [x] <criterio 1> → `test_rf…` / `describe('RF-…')`
- [x] <criterio 2> → …

## Evidencia TDD
| Fase | Commit | Resultado |
|---|---|---|
| 🔴 Rojo | `abc1234 test(T-NNN): …` | N tests fallando por <motivo> |
| 🟢 Verde | `def5678 feat(T-NNN): …` | N/N en verde; tests intactos |
| 🔵 Refactor | `…` o «sin cambios» | en verde |
| 🔧 Fix | `…` o «sin hallazgos» | en verde |

(En tickets de `infra` o `e2e`, esta sección se reemplaza por **Verificación**: qué se ejecutó y con qué resultado, y qué queda por verificar en GitHub o en el servidor.)

## Tests y cobertura
- Tests nuevos: N (lista corta, nombrados por RF).
- Suite afectada: N pasan, 0 fallan.
- Cobertura: `negocio/` X % · backend X % · lógica del front X % (umbrales 80 / 70 / 70).
- Lint y type-check: ✅

## Review
- Reviewer: `reviewer-ticket` | `reviewer-seguridad` (modelo …).
- Hallazgos: N bloqueantes, N importantes, N menores → arreglados en `…`; menores pendientes anotados en el ticket.

## Cambios principales
- `ruta/archivo` — qué cambió, en una línea.

## Modelos usados
| Rol | Planificado | Real |
|---|---|---|
| Tests | sonnet | sonnet |
| Implementación | opus | opus |
| Refactor | … | … |
| Review | sonnet | sonnet |

(Si hubo escalado, se indica en «Real» y por qué.)

## Checklist
- [x] Tests escritos antes que el código y nombrados por RF
- [x] Tests intactos después del verde (verificado con `git diff`)
- [x] Lint, type-check y tests en verde
- [x] Sin secretos, `.env` ni claves en el diff
- [x] Fuera de alcance respetado (sin pagos online, publicación automática, GDS, facturación ni manejo de contraseñas)
- [x] El ticket queda en `estado: hecho` en este PR
- [ ] Aprobación de otro integrante *(solo riesgo alto)*

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Abrir el PR
```bash
gh pr create --base main --head <rama> --title "T-NNN: <titulo>" --body-file <archivo temporal>
```
- Si el ticket es de **riesgo alto**, agregá `--label riesgo-alto` si la etiqueta existe en el repo (si no, no la crees: alcanza con la línea del encabezado).
- Devolvé la URL del PR. **No mergees** desde esta skill: el merge lo decide `/implementar-ticket` según el riesgo y el CI.

## No hacer
- No inventar resultados de tests, cobertura ni hallazgos.
- No pegar en el PR secretos ni salidas con datos de `.env`.
- No dejar el archivo temporal del cuerpo dentro del repo.
