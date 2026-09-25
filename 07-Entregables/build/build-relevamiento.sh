#!/usr/bin/env bash
# Genera el DOCX entregable de Relevamiento desde los .md fuente del vault.
# Uso: ejecutar desde la raíz del repo:  bash "07-Entregables/build/build-relevamiento.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$(mktemp -d)"
# Salida por defecto: el entregable en el vault. Para una compilación de prueba,
# exportar OUT_OVERRIDE con una ruta alternativa (no toca el docx del vault).
OUT="${OUT_OVERRIDE:-$ROOT/07-Entregables/Relevamiento/Rumbo — Relevamiento.docx}"

# Detectar pandoc: PATH, o instalación típica de winget/local en Windows.
if command -v pandoc >/dev/null 2>&1; then
  PANDOC="pandoc"
elif [ -x "$LOCALAPPDATA/Pandoc/pandoc.exe" ]; then
  PANDOC="$LOCALAPPDATA/Pandoc/pandoc.exe"
elif [ -x "$HOME/AppData/Local/Pandoc/pandoc.exe" ]; then
  PANDOC="$HOME/AppData/Local/Pandoc/pandoc.exe"
else
  echo "ERROR: no se encontró pandoc. Instalar: winget install --id JohnMacFarlane.Pandoc" >&2
  exit 1
fi

# Mismo filtrado que los otros entregables: deja solo lo que ven los profesores.
# Quita frontmatter, tags, las secciones internas (Revisión, Diagramas, Decisiones),
# las notas meta en blockquote con referencias a decisiones y las referencias inline
# a las decisiones internas (DEC-####). Convierte los wikilinks a texto plano y
# limpia los artefactos que deja ese recorte (paréntesis vacíos, comas sueltas).
filtrar() {
  awk '
    BEGIN{fm=0; skip=0}
    NR==1 && $0=="---"{fm=1; next}
    fm==1 && $0=="---"{fm=0; next}
    fm==1{next}
    /^## /{ if ($0 ~ /Revisi/ || $0 ~ /Diagramas/ || $0 ~ /Decisiones/) skip=1; else skip=0 }
    skip==1{next}
    /^tags::/{next}
    /^>/ && /DEC-/{next}
    {print}
  ' "$1" | sed -E '
    s/,?[[:space:]]*(ver|según|conforme a)[[:space:]]+\[\[DEC-[^]]*\]\]//gi;
    s/[[:space:]]*\[\[DEC-[^]]*\]\]//g;
    s/\[\[[^]|]*\|([^]]*)\]\]/\1/g;
    s/\[\[([^]]*)\]\]/\1/g;
    s/⚠️//g;
    s/[[:space:]]*`?#[A-Za-z][A-Za-z-]*(\/[A-Za-z-]+)*`?//g;
    s/[[:space:]]*—[[:space:]]*ver Revisión\.?//g;
    s/[[:space:]]*\(ver Revisión\.?\)//g;
    s/,?[[:space:]]*ver Revisión\.?//g;
    s/[[:space:]]*,[[:space:]]*\)/)/g;
    s/[[:space:]]*—[[:space:]]*\)/)/g;
    s/[[:space:]]*;[[:space:]]*\)/)/g;
    s/\([[:space:]]*\)//g;
    s/[[:space:]]+\./\./g;
    s/\.\.+/\./g;
    s/[[:space:]]{2,}/ /g;
    s/[[:space:]]+,/,/g'
}

# Orden del documento: justificación → herramientas → objetivos → alcance →
# actores → circuito de la consulta a la venta → figura del diagrama de secuencia.
filtrar "$ROOT/01-Relevamiento/Justificación del sistema.md"          > "$BUILD/10-justificacion.md"
filtrar "$ROOT/01-Relevamiento/Herramientas del proyecto.md"          > "$BUILD/20-herramientas.md"
filtrar "$ROOT/01-Relevamiento/Objetivos del sistema.md"              > "$BUILD/30-objetivos.md"
# Las marcas ❌/✅ de las listas de alcance sirven en Obsidian, pero no van al entregable.
filtrar "$ROOT/01-Relevamiento/Alcance y fuera de alcance.md" | sed -E 's/^- (❌|✅) /- /' > "$BUILD/40-alcance.md"
filtrar "$ROOT/01-Relevamiento/Actores.md"                            > "$BUILD/50-actores.md"
filtrar "$ROOT/01-Relevamiento/Circuito de la consulta a la venta.md" > "$BUILD/60-circuito.md"

# Figura del diagrama de secuencia (imagen previamente renderizada desde el Mermaid
# de 03-Dominio/Diagramas/Secuencia/DGM-SEC — De la consulta a la venta.md). Se referencia SOLO por
# nombre y se resuelve con --resource-path, para evitar el bug de rutas con espacios.
IMGDIR="$ROOT/07-Entregables/Relevamiento/img"
IMG="$IMGDIR/DGM-SEC-consulta-a-venta.png"
if [ -f "$IMG" ]; then
  printf '![Figura 1. Diagrama de secuencia del circuito de la consulta a la venta.](DGM-SEC-consulta-a-venta.png){ width=95%% }\n' > "$BUILD/70-figura.md"
fi

# Plantilla de estilos: la del argumento 1, o la del repo si existe
REF="${1:-$ROOT/07-Entregables/build/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$ROOT/07-Entregables/Relevamiento/00 - Portada.md" \
  "$BUILD/10-justificacion.md" \
  "$BUILD/20-herramientas.md" \
  "$BUILD/30-objetivos.md" \
  "$BUILD/40-alcance.md" \
  "$BUILD/50-actores.md" \
  "$BUILD/60-circuito.md" \
  ${IMG:+"$BUILD/70-figura.md"} \
  --toc --toc-depth=1 -M toc-title="Índice" \
  ${IMG:+--resource-path="$IMGDIR"} \
  "${REFARG[@]}" \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
# Regenerar la imagen del diagrama de secuencia desde su bloque Mermaid:
#   awk '/^```mermaid/{f=1;next} /^```/{f=0} f' "03-Dominio/Diagramas/Secuencia/DGM-SEC — De la consulta a la venta.md" > /tmp/sec.mmd
#   npx -y @mermaid-js/mermaid-cli -i /tmp/sec.mmd -o "07-Entregables/Relevamiento/img/DGM-SEC-consulta-a-venta.png" -b white -s 2
