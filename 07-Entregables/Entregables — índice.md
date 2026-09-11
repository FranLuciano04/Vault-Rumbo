---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 11/09/26
---
# Entregables — índice

tags:: #tipo/referencia #estado/formalizado

> Sección del cerebro para los **entregables a los profesores** (formatos pesados: `.docx`, PDF, imágenes). Son **artefactos derivados**: la fuente de verdad son los `.md` del vault. Ver [[Especificación de casos de uso — flujo]].

## Regla
- Nada acá se edita a mano: se **genera** desde los `.md` en cada punto de control.
- Para *leer* contenido, usá el `.md` fuente (barato en tokens), no el `.docx`.

## Entregables
| Entregable | Fuente (.md) | Salida | PC |
|---|---|---|---|
| Casos de uso | `02-Analisis/Casos de uso/CU-*.md` | `07-Entregables/Casos de uso/Rumbo — Casos de uso.docx` | PC1 |

## Parámetros del entregable (definido en la sync 11/09)
- **Contenido:** documento **completo** → carátula + breve **introducción** + **diagrama de casos de uso** ([[DGM — Casos de uso]], como imagen incrustada) + **actores** ([[Actores]]) + los **30 CU** especificados.
- **Filtrado (importante):** el docx **no** incluye la cocina interna del equipo. El script recorta, en cada CU, las secciones **`## 🔎 Revisión`**, **`## Diagramas`** y **`## Decisiones asociadas`**; la línea **`tags::`**; las **notas meta en blockquote** con referencias a decisiones; las **referencias inline a decisiones `DEC-####`** (con su conector); y los **hashtags de acción `#accion/...`**. El frontmatter YAML pandoc lo toma como metadata (no se imprime). Solo quedan las **funcionalidades**: descripción, actores, precondiciones, flujos, postcondiciones, reglas de negocio y entidades.
- **Orden:** numérico `CU-01 … CU-30` (por defecto del glob). _(Si se prefiere por módulo, se reordena la lista de entrada.)_
- **Carátula e introducción:** redactadas como fuente en `07-Entregables/Casos de uso/00 - Portada e introducción.md` (carátula por metadata: título, subtítulo, autores, fecha). Datos: **Universidad de Morón · Ingeniería Informática · Trabajo de Campo · 2.º cuatrimestre 2026**; integrantes **Francisco Luciano, Nahuel Viniegra, Paloma Patiño**. _(Fecha de entrega definitiva y comisión: confirmar con la cátedra.)_ Este archivo se pasa **primero** a pandoc, antes de los `CU-*.md`.
- **Estética:** plantilla `reference.docx` generada por `07-Entregables/build/make-reference.ps1` (PowerShell, sin dependencias): Cambria justificado, títulos navy jerarquizados con filete, A4 con márgenes 2,5 cm y numeración de páginas al pie.
- **Diagramas Mermaid:** se exportan aparte como imagen con `mermaid-cli` (motor **ELK**) y se **incrustan** por nombre vía `--resource-path` (resuelve el bug de rutas con espacios). Ver [[CONTINUAR — entregable Casos de uso]].

## Cómo generar el DOCX de casos de uso
**Forma recomendada** (hace el filtrado + portada + actores + CU automáticamente). Desde la raíz del repo:
```bash
bash "07-Entregables/build/build-casos-de-uso.sh"
```
Genera `07-Entregables/Casos de uso/Rumbo — Casos de uso.docx`. Usa por defecto la plantilla `07-Entregables/build/reference.docx` (o pasar otra como 1.er argumento). Requiere **pandoc** (ver [[Skills compartidas]]). Para una compilación de prueba sin tocar el docx del vault: `OUT_OVERRIDE=/ruta/prueba.docx bash "07-Entregables/build/build-casos-de-uso.sh"`.

Regenerar la **plantilla** estética (si se cambian estilos):
```bash
powershell -ExecutionPolicy Bypass -File "07-Entregables/build/make-reference.ps1"
```
Regenerar la **imagen del diagrama** desde el Mermaid de [[DGM — Casos de uso]] (motor ELK): ver el comando en [[CONTINUAR — entregable Casos de uso]].

<details><summary>Comando pandoc manual (sin filtrado)</summary>

Desde la raíz del repo:

**PowerShell (Windows):**
```powershell
$portada = "07-Entregables/Casos de uso/00 - Portada e introducción.md"
$cu = Get-ChildItem "02-Analisis/Casos de uso/CU-*.md" | Sort-Object Name
pandoc $portada $cu --toc `
  -o "07-Entregables/Casos de uso/Rumbo — Casos de uso.docx"
```

**Bash:**
```bash
pandoc "07-Entregables/Casos de uso/00 - Portada e introducción.md" \
  "02-Analisis/Casos de uso/"CU-*.md \
  --toc \
  -o "07-Entregables/Casos de uso/Rumbo — Casos de uso.docx"
```

- El glob `CU-*.md` ordena CU-01…CU-30 correctamente (numeración con cero a la izquierda).
- ⚠️ El comando de arriba exporta el `.md` **completo**; falta agregar el **paso de filtrado** (recortar `## 🔎 Revisión` y `tags::` de cada CU a un `.md` temporal antes de pasarlo a pandoc). Se arma al compilar el primer entregable.
- Estilo opcional: agregar `--reference-doc=07-Entregables/build/plantilla.docx` con la portada/estilos de la cátedra.
- Los diagramas Mermaid (p. ej. [[DGM — Casos de uso]]) se exportan aparte como imagen; no se incrustan en este paso.
</details>

## Estado (11/09)
- ✅ **pandoc** instalado; DOCX de Casos de uso generado con `build-casos-de-uso.sh`.
- ✅ **Diagrama de casos de uso** rehecho (motor ELK, más legible) e **incrustado** como imagen en el DOCX.
- ✅ **Plantilla estética** académica (`reference.docx` vía `make-reference.ps1`): Cambria, títulos navy, A4, paginación.
- ✅ **Contenido saneado**: el DOCX ya no filtra cocina interna (decisiones, notas de revisión, tags).
- El `.docx` se versiona en Git (en `07-Entregables/`) además de poder regenerarlo por script.

## Pendiente
- Confirmar con la cátedra la **fecha de entrega definitiva** y la **comisión** (hoy en la carátula: 23/10/26).
