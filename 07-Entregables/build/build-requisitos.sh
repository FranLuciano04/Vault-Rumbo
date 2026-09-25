#!/usr/bin/env bash
# Genera el DOCX entregable de Requisitos desde el .md fuente.
# Uso: ejecutar desde la raíz del repo:  bash "07-Entregables/build/build-requisitos.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$(mktemp -d)"
# Salida por defecto: el entregable en el vault. Para una compilación de prueba,
# exportar OUT_OVERRIDE con una ruta alternativa (no toca el docx del vault).
OUT="${OUT_OVERRIDE:-$ROOT/07-Entregables/Requisitos/Rumbo — Requisitos.docx}"

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

# Mismo filtrado que build-casos-de-uso.sh: deja solo lo que ven los profesores.
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

filtrar "$ROOT/02-Analisis/Requisitos funcionales.md" > "$BUILD/10-requisitos.md"

# Plantilla de estilos: la del argumento 1, o la del repo si existe
REF="${1:-$ROOT/07-Entregables/build/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$ROOT/07-Entregables/Requisitos/00 - Portada e introducción.md" \
  "$BUILD/10-requisitos.md" \
  --toc --toc-depth=1 -M toc-title="Índice" \
  "${REFARG[@]}" \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
# Estilos: reference.docx generado por make-reference.ps1 (o pasar otro como 1.er argumento).
