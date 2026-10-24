---
tipo: decision
estado: formalizado
modulo: [proceso]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 24/10/26
supersede: DEC-0014 (en parte: tickets de arreglo y de hallazgo)
actualizado: 24/10/26
---
# DEC-0019 Las fallas se arreglan al encontrarlas

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo** y comunicada por Paloma el 24/10/26. Reemplaza **solo** la parte de [[DEC-0014 Flujo de implementación con agentes|DEC-0014]] que convertía las fallas y los hallazgos en tickets nuevos. El resto del flujo (semáforo, TDD con subagentes, review de Codex por módulo y PR) no cambia.

## Contexto
Con [[DEC-0014 Flujo de implementación con agentes|DEC-0014]], toda falla que aparecía fuera de lo que pedía el ticket se convertía en un ticket nuevo (`origen: hallazgo T-NNN`), y los hallazgos de Codex se convertían en tickets de arreglo. Así se crearon T-141, T-142, T-146 a T-149, T-151, T-153 y T-155 a T-163. Algunas fallas, como las cuatro para levantar Rumbo en local del 23/10, quedaban esperando que alguien decidiera si pasaban a ticket. Cada ticket suma el costo de tomarlo, de abrir su rama y de su PR, aunque el arreglo sea de unas pocas líneas.

## Decisión
1. Una falla se **arregla cuando se encuentra**, sin crear un ticket.
2. **Si aparece mientras se implementa un ticket**, se arregla en esa misma rama y en el mismo PR. Va con un test que la reproduzca cuando sea código, y se anota en las «Notas de implementación» del ticket y en el PR.
3. **Si aparece fuera de un ticket** (al probar Rumbo a mano, en una auditoría o en la review de Codex), se arregla en una rama `fix/<descripción-corta>` con su PR. Se siguen los mismos pasos: test que reproduce la falla, arreglo, review con un modelo distinto y CI en verde. Se registra en la bitácora.
4. **Hallazgos de Codex:** los bloqueantes e importantes confirmados se arreglan en ramas `fix/MN-…`, no como tickets. El módulo se cierra cuando esos PR están mergeados. Los menores se le siguen consultando a la persona.
5. **Sigue siendo ticket** lo que es trabajo nuevo y no una falla: funcionalidad que el plan no preveía o un cambio de alcance. Si no queda claro si es una falla o funcionalidad nueva, se le pregunta a la persona.
6. Un arreglo que toque auth, permisos, dinero, estados o el proceso diario es de **riesgo alto**: lo revisa `reviewer-seguridad` y necesita la aprobación de otro integrante antes del merge, igual que un ticket de riesgo alto.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Arreglar la falla al encontrarla, en la rama en curso o en `fix/…` | Menos burocracia; la falla no queda abierta esperando una decisión | El tablero de tickets ya no muestra esos arreglos: hay que buscarlos en la bitácora y en los PR | ✅ |
| Seguir creando un ticket por falla (DEC-0014) | Trazabilidad completa en el tablero | Cada arreglo chico paga el costo de un ticket entero; las fallas quedaban esperando | ❌ |

## Impacto
- **Skills:** `/implementar-ticket` 1.4.0 (*Cuando algo falla*, punto 4) y `/cerrar-modulo` 1.1.0 (fase B).
- **Notas:** [[Flujo de implementación]] (review de Codex y auditoría de dependencias) y la nota en [[DEC-0014 Flujo de implementación con agentes|DEC-0014]].
- Los tickets de hallazgo que ya existen y siguen libres (por ejemplo, T-146, T-147 y T-153) quedan como están: se toman y se cierran normalmente.

## Estado / supersesión
Reemplaza en parte a DEC-0014, solo en lo que se describe arriba. Si una nueva `DEC-` vuelve a pedir tickets para las fallas, esta se marca como reemplazada.
