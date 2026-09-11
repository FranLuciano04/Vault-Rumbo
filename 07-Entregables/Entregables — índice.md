---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 10/09/26
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
- **Contenido:** documento **completo** → carátula + breve **introducción** + **diagrama de casos de uso** ([[DGM — Casos de uso]], como imagen) + **actores** ([[Actores]]) + los **30 CU** especificados.
- **Filtrado (importante):** el docx **no** incluye lo interno de cada `CU-xx.md`. Antes de compilar se recorta, en cada CU, la sección **`## 🔎 Revisión`** (hacia abajo) y la línea **`tags::`**. El frontmatter YAML pandoc lo toma como metadata (no se imprime).
- **Orden:** numérico `CU-01 … CU-30` (por defecto del glob). _(Si se prefiere por módulo, se reordena la lista de entrada.)_
- **Carátula e introducción:** ya redactadas como fuente en `07-Entregables/Casos de uso/00 - Portada e introducción.md`. Datos: **Universidad de Morón · Ingeniería Informática · Trabajo de Campo · 2.º cuatrimestre 2026**; integrantes **Francisco Luciano, Nahuel Viniegra, Paloma Patiño**. _(Fecha de entrega definitiva y comisión: confirmar con la cátedra.)_ Este archivo se pasa **primero** a pandoc, antes de los `CU-*.md`.
- **Diagramas Mermaid:** se exportan aparte como imagen y se insertan; no se incrustan desde el `.md`.

## Cómo generar el DOCX de casos de uso
Requiere **pandoc** instalado (ver [[Skills compartidas]]). Desde la raíz del repo:

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

## Pendiente
- Instalar y registrar **pandoc** cuando se compile el primer entregable (Windows: `winget install --id JohnMacFarlane.Pandoc`).
- Definir si se versiona el `.docx` en Git o se genera al vuelo por PC.
