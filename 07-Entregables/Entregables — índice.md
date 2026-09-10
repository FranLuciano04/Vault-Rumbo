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

## Cómo generar el DOCX de casos de uso
Requiere **pandoc** instalado (ver [[Skills compartidas]]). Desde la raíz del repo:

**PowerShell (Windows):**
```powershell
pandoc (Get-ChildItem "02-Analisis/Casos de uso/CU-*.md" | Sort-Object Name) `
  --toc --metadata title="Rumbo — Casos de uso" `
  -o "07-Entregables/Casos de uso/Rumbo — Casos de uso.docx"
```

**Bash:**
```bash
pandoc "02-Analisis/Casos de uso/"CU-*.md \
  --toc --metadata title="Rumbo — Casos de uso" \
  -o "07-Entregables/Casos de uso/Rumbo — Casos de uso.docx"
```

- El glob `CU-*.md` ordena CU-01…CU-25 correctamente (numeración con cero a la izquierda).
- Estilo opcional: agregar `--reference-doc=07-Entregables/build/plantilla.docx` con la portada/estilos de la cátedra.
- Los diagramas Mermaid (p. ej. [[DGM — Casos de uso]]) se exportan aparte como imagen; no se incrustan en este paso.

## Pendiente
- Instalar y registrar **pandoc** cuando se compile el primer entregable (Windows: `winget install --id JohnMacFarlane.Pandoc`).
- Definir si se versiona el `.docx` en Git o se genera al vuelo por PC.
