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
  awk '
    BEGIN{fm=0}
    NR==1 && $0=="---"{fm=1; next}
    fm==1 && $0=="---"{fm=0; next}
    fm==1{next}
    /^## .*Revisi/{exit}
    /^tags::/{next}
    {print}
  ' "$1" | sed -E 's/\[\[[^]|]*\|([^]]*)\]\]/\1/g; s/\[\[([^]]*)\]\]/\1/g; s/\s*—\s*ver Revisión\.?//g; s/\s*\(ver Revisión\.?\)//g; s/,?\s*ver Revisión\.?//g'
}

filtrar "$ROOT/01-Relevamiento/Actores.md" > "$BUILD/10-actores.md"

i=20
for f in "$ROOT/02-Analisis/Casos de uso/"CU-*.md; do
  filtrar "$f" > "$BUILD/$i-$(basename "$f")"
  i=$((i+1))
done

"$PANDOC" \
  "$ROOT/07-Entregables/Casos de uso/00 - Portada e introducción.md" \
  "$BUILD/10-actores.md" \
  "$BUILD/"[0-9][0-9]-CU-*.md \
  --toc --toc-depth=1 \
  ${1:+--reference-doc="$1"} \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
# Nota: el diagrama de casos de uso (Mermaid en 02-Analisis/DGM — Casos de uso.md)
# se exporta aparte como imagen y se inserta manualmente (pandoc no lo renderiza).
# Estilos opcionales: pasar como 1.er argumento un reference.docx.
