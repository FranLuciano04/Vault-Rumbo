#!/usr/bin/env bash
# Genera el DOCX entregable de Casos de uso desde los .md fuente.
# Uso: ejecutar desde la raíz del repo:  bash "07-Entregables/build/build-casos-de-uso.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$(mktemp -d)"
# Salida por defecto: el entregable en el vault. Para una compilación de prueba,
# exportar OUT_OVERRIDE con una ruta alternativa (no toca el docx del vault).
OUT="${OUT_OVERRIDE:-$ROOT/07-Entregables/Casos de uso/Rumbo — Casos de uso.docx}"

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

# Filtra cada .md para el ENTREGABLE (visible a los profesores): deja solo las
# funcionalidades del caso de uso y elimina toda la "cocina interna" del equipo.
# Quita: frontmatter, tags, las secciones internas (Diagramas, Revisión y
# Decisiones asociadas), las notas meta en blockquote con referencias a decisiones,
# y las referencias inline a las decisiones internas (DEC-####). Convierte los
# wikilinks [[x|y]]/[[x]] a texto y limpia artefactos (paréntesis vacíos, espacios).
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

# Sección del diagrama de casos de uso (imagen previamente renderizada).
# Se referencia SOLO por nombre y se resuelve con --resource-path para evitar
# el bug de rutas con espacios (%20) que impedía incrustar la imagen.
IMGDIR="$ROOT/07-Entregables/Casos de uso/img"
IMG="$IMGDIR/DGM-casos-de-uso.png"
if [ -f "$IMG" ]; then
  printf '# Diagrama de casos de uso\n\n![Diagrama general de casos de uso de Rumbo.](DGM-casos-de-uso.png){ width=50%% }\n' > "$BUILD/05-diagrama.md"
fi

filtrar "$ROOT/01-Relevamiento/Actores.md" > "$BUILD/10-actores.md"

i=20
for f in "$ROOT/02-Analisis/Casos de uso/"CU-*.md; do
  filtrar "$f" > "$BUILD/$i-$(basename "$f")"
  i=$((i+1))
done

# Plantilla de estilos: la del argumento 1, o la del repo si existe
REF="${1:-$ROOT/07-Entregables/build/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$ROOT/07-Entregables/Casos de uso/00 - Portada e introducción.md" \
  ${IMG:+"$BUILD/05-diagrama.md"} \
  "$BUILD/10-actores.md" \
  "$BUILD/"[0-9][0-9]-CU-*.md \
  --toc --toc-depth=1 -M toc-title="Índice" \
  ${IMG:+--resource-path="$IMGDIR"} \
  "${REFARG[@]}" \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
# Nota: el diagrama de casos de uso (Mermaid en 02-Analisis/DGM — Casos de uso.md)
# se exporta aparte como imagen con mermaid-cli (motor ELK) y se incrusta por nombre
# vía --resource-path. Regenerar la imagen: ver 07-Entregables/CONTINUAR — entregable Casos de uso.md.
# Estilos: reference.docx generado por make-reference.ps1 (o pasar otro como 1.er argumento).
