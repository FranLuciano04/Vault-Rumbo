#!/usr/bin/env bash
# Genera el DOCX entregable de Casos de uso desde los .md fuente.
# Uso: ejecutar desde la raíz del repo:  bash "07-Entregables/build/build-casos-de-uso.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$(mktemp -d)"
OUT="$ROOT/07-Entregables/Casos de uso/Rumbo — Casos de uso.docx"

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

# Filtra cada .md: quita frontmatter YAML, líneas tags::, la sección '## 🔎 Revisión'
# (hacia abajo), convierte wikilinks [[x|y]]/[[x]] a texto y limpia coletillas 'ver Revisión'.
filtrar() {
  # Quita frontmatter y tags; dropea las secciones internas (Diagramas, Revisión);
  # convierte wikilinks a texto y limpia marcadores/coletillas internas.
  awk '
    BEGIN{fm=0; skip=0}
    NR==1 && $0=="---"{fm=1; next}
    fm==1 && $0=="---"{fm=0; next}
    fm==1{next}
    /^## /{ if ($0 ~ /Revisi/ || $0 ~ /Diagramas/) skip=1; else skip=0 }
    skip==1{next}
    /^tags::/{next}
    {print}
  ' "$1" | sed -E '
    s/\[\[[^]|]*\|([^]]*)\]\]/\1/g;
    s/\[\[([^]]*)\]\]/\1/g;
    s/⚠️//g;
    s/\s*—\s*ver Revisión\.?//g;
    s/\s*\(ver Revisión\.?\)//g;
    s/,?\s*ver Revisión\.?//g'
}

# Sección del diagrama de casos de uso (imagen previamente renderizada)
IMG="$ROOT/07-Entregables/Casos de uso/img/DGM-casos-de-uso.png"
if [ -f "$IMG" ]; then
  printf '# Diagrama de casos de uso\n\n![Diagrama de casos de uso de Rumbo](<%s>)\n' "$IMG" > "$BUILD/05-diagrama.md"
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
  --toc --toc-depth=1 \
  "${REFARG[@]}" \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
# Nota: el diagrama de casos de uso (Mermaid en 02-Analisis/DGM — Casos de uso.md)
# se exporta aparte como imagen y se inserta manualmente (pandoc no lo renderiza).
# Estilos opcionales: pasar como 1.er argumento un reference.docx.
