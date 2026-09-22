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
| Requisitos | `02-Analisis/Requisitos funcionales.md` | `07-Entregables/Requisitos/Rumbo — Requisitos.docx` | PC1 |

## Parámetros del entregable de Casos de uso (definido en la sync 11/09)
- **Contenido:** documento **completo** → carátula + breve **introducción** + **diagrama de casos de uso** ([[DGM — Casos de uso]], como imagen incrustada) + **actores** ([[Actores]]) + los **30 CU** especificados.
- **Filtrado (importante):** el docx **no** incluye la cocina interna del equipo. El script recorta, en cada CU, las secciones **`## 🔎 Revisión`**, **`## Diagramas`** y **`## Decisiones asociadas`**; la línea **`tags::`**; las **notas meta en blockquote** con referencias a decisiones; las **referencias inline a decisiones `DEC-####`** (con su conector); y los **hashtags de acción `#accion/...`**. El frontmatter YAML pandoc lo toma como metadata (no se imprime). Solo quedan las **funcionalidades**: descripción, actores, precondiciones, flujos, postcondiciones, reglas de negocio y entidades.
- **Orden:** numérico `CU-01 … CU-30` (por defecto del glob). _(Si se prefiere por módulo, se reordena la lista de entrada.)_
- **Carátula e introducción:** redactadas como fuente en `07-Entregables/Casos de uso/00 - Portada e introducción.md` (carátula por metadata: título, subtítulo, autores, fecha). Datos: **Universidad de Morón · Ingeniería Informática · Trabajo de Campo · 2.º cuatrimestre 2026**; integrantes **Francisco Luciano, Nahuel Viniegra, Paloma Patiño**. _(Fecha de entrega definitiva y comisión: confirmar con la cátedra.)_ Este archivo se pasa **primero** a pandoc, antes de los `CU-*.md`.
- **Estética:** plantilla `reference.docx` generada por `07-Entregables/build/make-reference.ps1` (PowerShell, sin dependencias): Cambria justificado, títulos navy jerarquizados con filete, A4 con márgenes 2,5 cm y numeración de páginas al pie.
- **Diagramas Mermaid:** se exportan aparte como imagen con `mermaid-cli` (motor **ELK**) y se **incrustan** por nombre vía `--resource-path` (resuelve el bug de rutas con espacios). Ver [[CONTINUAR — entregable Casos de uso]].

## Parámetros del entregable de Requisitos (22/09)
- **Contenido:** carátula + introducción + los **153 RF** agrupados en 11 módulos + los **16 RNF** por atributo de calidad (seguridad, fiabilidad y robustez, rendimiento, usabilidad, disponibilidad, portabilidad, mantenibilidad, localización y privacidad), cada uno con **justificación** y **criterio de verificación** + el **alcance del sistema** + la **matriz de trazabilidad**.
- **Narrativa (importante):** el documento se presenta en el sentido **requisitos → casos de uso**: los requisitos son la base del análisis y los CU son su **realización**. Cada RF lleva el campo *Casos de uso*, no *Origen*, y la matriz se lee "este CU realiza estos requisitos". Al editar el `.md` fuente hay que **sostener ese sentido**.
- **Sin cocina interna:** el cuerpo **no menciona** decisiones internas, estados `en-revision`, pendientes ni valores a validar. Todo eso vive en la sección `## 🔎 Revisión` de [[Requisitos funcionales]], que el filtro recorta.
- **Fuente única:** [[Requisitos funcionales]]. La carátula y la introducción viven en `07-Entregables/Requisitos/00 - Portada e introducción.md`.
- **Filtrado:** usa **el mismo `filtrar()`** que el entregable de casos de uso (frontmatter, `tags::`, la sección `## 🔎 Revisión`, las notas meta en blockquote y las referencias inline a `DEC-####`). Verificado el 22/09: **0 fugas y 0 artefactos**.
- **Estética:** la misma plantilla `reference.docx`, sin cambios.
- ⚠️ Al escribir en el `.md` fuente, **no encadenar dos referencias `DEC-` dentro de un mismo paréntesis**: al recortarlas quedan separadores sueltos que el limpiador no resuelve. Mejor todavía: **no citar `DEC-` en el cuerpo**, porque el entregable no las muestra.
- ⚠️ **Cerrar el `.docx` en Word antes de compilar**: si está abierto, el script falla con *permission denied* al escribir la salida.

## Cómo generar el DOCX de casos de uso
**Forma recomendada** (hace el filtrado + portada + actores + CU automáticamente). Desde la raíz del repo:
```bash
bash "07-Entregables/build/build-casos-de-uso.sh"
```
Genera `07-Entregables/Casos de uso/Rumbo — Casos de uso.docx`. Usa por defecto la plantilla `07-Entregables/build/reference.docx` (o pasar otra como 1.er argumento). Requiere **pandoc** (ver [[Skills compartidas]]). Para una compilación de prueba sin tocar el docx del vault: `OUT_OVERRIDE=/ruta/prueba.docx bash "07-Entregables/build/build-casos-de-uso.sh"`.

## Cómo generar el DOCX de requisitos
Desde la raíz del repo:
```bash
bash "07-Entregables/build/build-requisitos.sh"
```
Genera `07-Entregables/Requisitos/Rumbo — Requisitos.docx` desde [[Requisitos funcionales]], con la misma plantilla y el mismo filtrado. Admite igual `OUT_OVERRIDE` para una compilación de prueba.

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
