#!/usr/bin/env bash
# Genera el DOCX entregable de Inteligencia artificial desde los .md fuente del vault:
# el modelo de IA del producto (DEC-0012) y los agentes de IA del proyecto (E3).
# Uso: ejecutar desde la raíz del repo:  bash "07-Entregables/build/build-ia.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$(mktemp -d)"
# Salida por defecto: el entregable en el vault. Para una compilación de prueba,
# exportar OUT_OVERRIDE con una ruta alternativa (no toca el docx del vault).
OUT="${OUT_OVERRIDE:-$ROOT/07-Entregables/IA/Rumbo — Inteligencia artificial.docx}"

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
    s/([^[:space:]])[[:space:]]{2,}/\1 /g;
    s/[[:space:]]+,/,/g'
}

# Ajustes propios de este entregable, sobre la salida de filtrar():
#   $1 = título de la sección en el documento (reemplaza el H1 de la nota)
#   $2 = regex de las secciones ## que no van al documento
# Además quita los blockquotes (notas internas) y cambia el bloque Mermaid por su
# figura ya renderizada, si se pasa $3 (línea Markdown de la imagen).
ajustar() {
  awk -v titulo="$1" -v omitir="$2" -v figura="$3" '
    BEGIN{h1=0; skip=0; mer=0}
    /^# / && h1==0 { print "# " titulo; h1=1; next }
    /^## /{ skip = (omitir != "" && $0 ~ omitir) ? 1 : 0 }
    skip==1{next}
    /^```mermaid/{ mer=1; if (figura != "") print figura; next }
    mer==1 && /^```/{ mer=0; next }
    mer==1{next}
    /^>/{next}
    {print}
  ' | sed -E '
    s/[[:space:]]*\(ver Contexto eficiente con Claude \(ahorro de tokens\)\)//g;
    s/Según la Bitácora de sesiones:/Según el registro de sesiones del equipo:/g;
    s/^ ya fijó LangChain y Claude\./El stack del proyecto ya fijó LangChain y Claude./;
    s/\. ya fijó LangChain y Claude\./. El stack del proyecto ya fijó LangChain y Claude./;
    s/\| ✅ \|/| Sí |/g;
    s/\| ❌ \|/| No |/g'
}

# Orden del documento: modelo de IA del producto → agentes de IA del proyecto.
filtrar "$ROOT/05-Diseño/Decisiones/DEC-0012 Modelo de IA del producto.md" \
  | ajustar "Modelo de IA del producto" "Impacto|Decisores|Vínculo" "" > "$BUILD/10-modelo.md"

# Figura del ciclo de trabajo: PNG que genera render-diagramas-diseno.sh desde el
# Mermaid de la nota. Se referencia solo por nombre y se resuelve con --resource-path.
IMGDIR="$ROOT/05-Diseño/img"
FIG=""
[ -f "$IMGDIR/IA-ciclo-de-trabajo.png" ] && FIG='![Figura 1. Ciclo de trabajo de una sesión con el agente.](IA-ciclo-de-trabajo.png){ width=70% }'
filtrar "$ROOT/05-Diseño/IA — Agentes del proyecto.md" \
  | ajustar "Agentes de IA del proyecto" "IA dentro del producto" "$FIG" > "$BUILD/20-agentes.md"

# Plantilla de estilos: la del argumento 1, o la del repo si existe
REF="${1:-$ROOT/07-Entregables/build/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$ROOT/07-Entregables/IA/00 - Portada.md" \
  "$BUILD/10-modelo.md" \
  "$BUILD/20-agentes.md" \
  --toc --toc-depth=1 -M toc-title="Índice" \
  --resource-path="$IMGDIR" \
  "${REFARG[@]}" \
  -o "$OUT"

rm -rf "$BUILD"
echo "OK -> $OUT"
