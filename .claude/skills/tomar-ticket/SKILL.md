---
name: tomar-ticket
description: Toma el próximo ticket de implementación de Rumbo con el semáforo de Git (push atómico a main), o uno puntual si se lo nombra. También libera tickets propios o vencidos. Usar cuando alguien quiera empezar a programar, pida «dame un ticket», «qué hay para hacer», «tomá T-NNN» o «liberá T-NNN».
---

# Tomar un ticket

Proceso completo en `06-Desarrollo/Flujo de implementación.md` (DEC-0014). Todo lo mecánico lo hace el script, que no gasta tokens:

```bash
node 06-Desarrollo/herramientas/tickets.mjs <comando>
```

## Pasos

1. **Quién sos:** `git config user.name` (mapa de nombres en `00-Inicio/Bitácora de sesiones.md#Quién es quién`).
2. **Árbol limpio en `main`:** si `git status` muestra cambios, terminarlos y commitearlos según `CLAUDE.md`, o pedirle a la persona qué hacer. Nunca descartarlos.
3. **¿Ya tenés uno?** Correr `disponibles`. La primera línea dice si la persona ya tiene un ticket tomado: en ese caso no se toma otro (es uno por persona). Ofrecer seguir con `/implementar-ticket T-NNN`.
4. **Vencidos:** correr `vencidos`. Si hay tickets ajenos con más de 48 h sin actividad, **informarlos y preguntar** antes de liberarlos (`liberar T-NNN <motivo>`). Sugerir avisarle al dueño. Nunca liberarlos por cuenta propia.
5. **Elegir:** si la persona nombró un ticket, ese. Si no, el **primero** de `disponibles` (el script ya los ordena por módulo y por cuántos tickets destraba). Decir en una línea cuál y por qué.
6. **Tomar:** `tomar T-NNN`.
   - `🟢 TOMADO` → listo.
   - `🔴 PERDIDO` (código de salida 3) → otra persona lo tomó un instante antes. Volver a correr `disponibles` y tomar el siguiente. Como máximo tres intentos; después, avisar.
   - `❌` → mostrar el error (dependencias sin terminar, ya tenés uno, cambios sin commitear…).
7. **Cerrar:** informar el ticket, su rama y su riesgo. Ofrecer arrancar ya con `/implementar-ticket T-NNN`, y recordar que la sesión debería estar en **Opus 5.5 con effort medio**.

## Liberar
- **Propio** (por ejemplo, la persona no puede seguir): `liberar T-NNN <motivo>`. Si la rama tiene trabajo, dejarla subida: quien lo retome parte de ahí.
- **Ajeno:** solo si `vencidos` lo muestra y la persona lo confirma. El script rechaza liberar un ticket ajeno con actividad de menos de 48 h.

## No hacer
- No editar a mano `estado`, `asignado`, `tomado_el` ni `rama` de un ticket.
- No hacer `push --force` ni resolver un conflicto del semáforo a mano: si el script pierde la carrera, se elige otro ticket.
