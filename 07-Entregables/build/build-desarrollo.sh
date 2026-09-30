#!/usr/bin/env bash
# Genera el DOCX entregable de Modelo de desarrollo e interfaces gráficas (H2):
# la metodología del equipo y la galería de pantallas del prototipo.
# Uso: ejecutar desde la raíz del repo:  bash "07-Entregables/build/build-desarrollo.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$(mktemp -d)"
# Salida por defecto: el entregable en el vault. Para una compilación de prueba,
# exportar OUT_OVERRIDE con una ruta alternativa (no toca el docx del vault).
OUT="${OUT_OVERRIDE:-$ROOT/07-Entregables/Desarrollo/Rumbo — Modelo de desarrollo.docx}"

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

# Ajustes propios de este entregable, sobre la salida de filtrar(): quita los
# blockquotes (notas internas) y cambia cada bloque Mermaid, en orden, por su figura
# ya renderizada (PNG de 05-Diseño/img/, que genera render-diagramas-diseno.sh).
ajustar() {
  awk '
    BEGIN{
      fig[1]="![Figura 1. Ciclo de vida iterativo, una iteración por punto de control.](DES-iteraciones.png){ width=100% }"
      fig[2]="![Figura 2. Pipeline de calidad de cada cambio en el código.](DES-pipeline-calidad.png){ width=100% }"
      mer=0; n=0
    }
    /^```mermaid/{ mer=1; n++; print fig[n]; next }
    mer==1 && /^```/{ mer=0; next }
    mer==1{next}
    /^>/{next}
    {print}
  '
}

# Galería de interfaces: una figura por fila de la tabla de pantallas de la nota
# «Prototipo UI». Si B5 suma pantallas a la tabla y sus PNG a img/, entran solas.
# Pie: «Figura N. Pantalla — casos de uso.»; las pantallas mobile van más angostas.
galeria() {
  # Los enlaces con alias dentro de la tabla vienen como [[nota\|alias]]: queda el alias.
  sed -E 's/\[\[[^]|\\]*\\\|([^]]*)\]\]/\1/g; s/\[\[([^]]*)\]\]/\1/g' "$1" | awk -F'|' -v inicio=3 '
    function limpiar(s) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", s); return s }
    /^\| [0-9]+ \| /{
      pant=limpiar($3); cu=limpiar($4); png=limpiar($5)
      gsub(/`/, "", png); sub(/^img\//, "", png)
      gsub(/[[:space:]]*·[[:space:]]*DEC-[0-9]+[^·]*/, "", cu)
      ancho = (png ~ /mobile/) ? "35%" : "100%"
      n = inicio + c++
      printf "![Figura %d. %s — %s.](%s){ width=%s }\n\n", n, pant, cu, png, ancho
    }'
}

# La referencia a la nota del prototipo sirve en el vault; en el documento sobra.
filtrar "$ROOT/05-Diseño/Modelo de desarrollo.md" | ajustar | sed "s/ (Prototipo UI)//" > "$BUILD/10-desarrollo.md"
galeria "$ROOT/07-Entregables/Prototipo/Prototipo UI.md" > "$BUILD/20-galeria.md"

# Plantilla de estilos: la del argumento 1, o la del repo si existe
REF="${1:-$ROOT/07-Entregables/build/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$ROOT/07-Entregables/Desarrollo/00 - Portada.md" \
  "$BUILD/10-desarrollo.md" \
  "$BUILD/20-galeria.md" \
  --toc --toc-depth=1 -M toc-title="Índice" \
  --resource-path="$ROOT/05-Diseño/img:$ROOT/07-Entregables/Prototipo/img" \
  "${REFARG[@]}" \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
