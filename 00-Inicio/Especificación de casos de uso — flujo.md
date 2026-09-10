---
tipo: referencia
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 10/09/26
---
# Especificación de casos de uso — flujo

tags:: #tipo/referencia #estado/formalizado #pc/pc1

> Cómo especificamos los casos de uso entre los tres y cómo se genera el entregable. **Para Claude:** al tocar un CU, seguí esto. Índice y división en [[MOC — Casos de uso]].

## Principio: Markdown fuente, DOCX derivado
- El **`.md` es la fuente de verdad** y el formato de lectura diaria. Vive en `02-Analisis/Casos de uso/CU-xx.md`. Es barato en tokens y versionable.
- El **`.docx` es un artefacto derivado**, no se escribe a mano: se **genera** desde los `.md` al llegar a un PC. Vive en `07-Entregables/`.
- **Regla de oro (ahorro de tokens):** para ver qué especificó otra persona, abrí **su `CU-xx.md`**, nunca el `.docx`. El DOCX es solo para los profesores.

## Quién hace qué
Cada CU tiene un `responsable:` en su frontmatter. División vigente en [[MOC — Casos de uso#División de la especificación (PC1)]]:
- **Francisco:** CU-01, CU-04→09, CU-21, CU-22.
- **Paloma:** CU-02, CU-03, CU-16→20, CU-23.
- **Nahuel:** CU-10→15, CU-24, CU-25.

## Cómo especificar un CU
1. Abrí tu `CU-xx.md` (ya existe como borrador con la plantilla).
2. Completá las secciones siguiendo [[PL-Caso de uso]] y el ejemplo [[CU-01 De la consulta a la venta]].
3. Respetá el lenguaje ubicuo, ARS y fechas `dd/mm/aa`.
4. Enlazá con `[[ ]]` las entidades, reglas y decisiones que apliques.
5. Cuando esté listo para revisión, pasá `#estado/borrador` → `#estado/en-revision` y avisá en la sync.
6. No formalices sin aprobación del equipo.

## Cómo se genera el DOCX entregable
- Herramienta: **pandoc** (registrada en [[Skills compartidas]] como dependencia externa). Solo la necesita quien compila el entregable.
- El procedimiento y el comando están en [[Entregables — índice]] (`07-Entregables/`).
- Se regenera en cada PC a partir de los `.md`; el DOCX no se edita a mano.

## Git
Commits pequeños; cada CU referencia sus reglas/decisiones. Ver [[Trabajo en equipo — Git y memoria]] y [[CLAUDE|CLAUDE.md]].
