#!/usr/bin/env bash
# Genera el DOCUMENTO ÚNICO del PC1 (H3): un solo .docx con las seis secciones de la
# documentación obligatoria de la cátedra y los anexos, en el orden acordado en la sync
# del 30/09/26 (ver «Estado del proyecto», paso H3).
#
#   1. Presentación general ............ del .docx de Relevamiento
#   2. Modelos de IA y justificación .... del .docx de Inteligencia artificial
#   3. Agentes de IA .................... del .docx de Inteligencia artificial
#   4. Modelo de datos y relaciones ..... de las notas (clases, ER, entidades y SQL)
#   5. Modelo de desarrollo ............. del .docx de Modelo de desarrollo
#   6. Arquitectura ..................... de las notas (ARQ, MVC y capas, OpenAPI)
#   Anexos: A requisitos y B casos de uso (de sus .docx), C diagramas UML (de las notas)
#           y D script SQL. El openapi.json completo se entrega aparte.
#
# Primero regenera los .docx sueltos (que quedan como respaldo) y después los convierte a
# Markdown con pandoc: así el documento único tiene exactamente su mismo contenido.
# Uso, desde la raíz del repo:  bash "07-Entregables/build/build-pc1.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md). Cerrar los .docx en Word antes.
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
B="$ROOT/07-Entregables/build"
BUILD="$(mktemp -d)"
OUT="${OUT_OVERRIDE:-$ROOT/07-Entregables/PC1/Rumbo — PC1.docx}"

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

# --- 0. Regenerar los .docx sueltos ----------------------------------------------------
if [ -z "$SIN_SUELTOS" ]; then
  for s in relevamiento ia desarrollo requisitos casos-de-uso; do
    bash "$B/build-$s.sh" >/dev/null
  done
fi

# --- Herramientas -------------------------------------------------------------------------
# Mismo filtrado que el resto de los entregables (cocina interna afuera).
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

# nota ARCHIVO: filtra una nota protegiendo el interior de sus bloques de código, que el
# filtro de arriba compactaría (sangría del JSON, árbol de carpetas).
nota() {
  local id; id="$(basename "$1" .md | tr -c 'A-Za-z0-9' '_')"
  awk -v map="$BUILD/codigo-$id.txt" '
    /^```/{ print; code = !code; next }
    code { n++; print n "\t" $0 > map; print "@@COD" n "@@"; next }
    { print }' "$1" > "$BUILD/prot-$id.md"
  filtrar "$BUILD/prot-$id.md" | awk -v map="$BUILD/codigo-$id.txt" '
    BEGIN{ while ((getline l < map) > 0) { i = index(l, "\t"); c[substr(l, 1, i-1)] = substr(l, i+1) } }
    /^@@COD[0-9]+@@$/{ k = substr($0, 6, length($0) - 7); print c[k]; next }
    { print }'
}

# desde_docx DOCX CARPETA: convierte un .docx suelto a Markdown, extrae sus imágenes y
# descarta el índice y la sección «Presentación» propia de ese documento.
desde_docx() {
  "$PANDOC" "$1" -t markdown --wrap=none --extract-media="$BUILD/$2" \
    | awk '/^# /{ skip = ($0 ~ /^# (Índice|Presentación)/) ? 1 : 0 } skip==1{next} {print}'
}

# omitir REGEX: descarta las secciones ## cuyo título coincide con REGEX.
omitir() {
  awk -v re="$1" '/^## /{ skip = ($0 ~ re) ? 1 : 0 } /^# /{skip=0} skip==1{next} {print}'
}

# titulo NUEVO: reemplaza el primer título # por NUEVO.
titulo() {
  awk -v t="$1" '/^# / && !h { print "# " t; h=1; next } {print}'
}

# figuras "pie|imagen" ...: cambia cada bloque Mermaid, en orden, por su PNG ya
# renderizado, y quita los blockquotes (notas internas).
figuras() {
  awk -v lista="$(printf '%s\n' "$@")" '
    BEGIN{ split(lista, f, "\n"); k=0 }
    /^```mermaid/{ mer=1; k++; split(f[k], p, "|"); if (p[2] != "") printf "![%s](%s){ width=100%% }\n", p[1], p[2]; next }
    mer==1 && /^```/{ mer=0; next }
    mer==1{next}
    /^```/{ code = !code }
    !code && /^>/{next}
    {print}'
}

# bajar N: baja N niveles los títulos (fuera de los bloques de código).
bajar() {
  awk -v n="$1" '
    /^```/{ code = !code }
    !code && /^#+ /{ printf "%s", substr("######", 1, n) }
    {print}'
}

# Enlaces Markdown a archivos del vault (p. ej. [`rumbo.sql`](rumbo.sql)): queda el texto.
sin_enlaces_locales() {
  sed -E 's/\[(`?[^]]+`?)\]\(([^):]+\.(sql|json|js|md))\)/\1/g'
}

h1() { printf '\n# %s\n\n' "$1"; }

D="$ROOT/03-Dominio/Diagramas"
A="$ROOT/05-Diseño/Arquitectura/img"

# --- 1 a 3: de los .docx de Relevamiento e Inteligencia artificial ----------------------
desde_docx "$ROOT/07-Entregables/Relevamiento/Rumbo — Relevamiento.docx" m-rel > "$BUILD/rel.md"
desde_docx "$ROOT/07-Entregables/IA/Rumbo — Inteligencia artificial.docx" m-ia > "$BUILD/ia.md"
desde_docx "$ROOT/07-Entregables/Desarrollo/Rumbo — Modelo de desarrollo.docx" m-des > "$BUILD/des.md"

{
  h1 "1. Presentación general"
  bajar 1 < "$BUILD/rel.md"
  h1 "2. Modelos de IA utilizados y justificación"
  awk '/^# Agentes de IA del proyecto/{exit} {print}' "$BUILD/ia.md" | bajar 1
  h1 "3. Agentes de IA"
  awk '/^# Agentes de IA del proyecto/{f=1} f' "$BUILD/ia.md" | bajar 1
} > "$BUILD/10-sec1a3.md"

# --- 4. Modelo de datos y relaciones: de las notas --------------------------------------
{
  h1 "4. Modelo de datos y relaciones"
  nota "$D/DGM — Diagrama de clases.md" | omitir "Refinamientos|Incoherencias|Pendientes|Relacionado" \
    | titulo "Diagrama de clases" \
    | figuras "Diagrama de clases, vista principal.|DGM-clases.png" \
              "Enumeraciones del dominio (1 de 3).|DGM-clases-enums-1.png" \
              "Enumeraciones del dominio (2 de 3).|DGM-clases-enums-2.png" \
              "Enumeraciones del dominio (3 de 3).|DGM-clases-enums-3.png" | bajar 1
  nota "$D/DGM-ER.md" | omitir "Resuelto|tamaño|Pendientes" | titulo "Modelo entidad-relación" \
    | figuras "Modelo entidad-relación.|DGM-ER.png" | bajar 1
  printf '\n## Entidades del dominio\n\n'
  for e in Cliente Oportunidad Cotización Viaje Pago Alerta Hotel Reseña Destino RequisitoDestino Operador Usuario ContenidoRed; do
    nota "$ROOT/03-Dominio/Entidades/$e.md" | omitir "Aparece en" | figuras | bajar 2
  done
  nota "$ROOT/05-Diseño/Datos/Modelo de datos SQL.md" | sin_enlaces_locales | figuras | bajar 1
} > "$BUILD/40-datos.md"

# --- 5. Modelo de desarrollo e interfaces gráficas --------------------------------------
{
  h1 "5. Modelo de desarrollo e interfaces gráficas"
  bajar 1 < "$BUILD/des.md"
} > "$BUILD/50-desarrollo.md"

# --- 6. Arquitectura: de las notas -------------------------------------------------------
{
  h1 "6. Arquitectura de la solución"
  nota "$ROOT/05-Diseño/Arquitectura/ARQ — Vista general.md" | omitir "Pendiente" \
    | titulo "Vistas de la arquitectura y modelo C4" \
    | figuras "Vista de despliegue.|ARQ-despliegue.png" \
              "Vista de componentes del monorepo.|ARQ-monorepo.png" \
              "Vista lógica del backend: capas.|ARQ-logica-capas.png" \
              "Vista lógica del backend: módulos.|ARQ-logica-modulos.png" \
              "Modelo C4, nivel 1: contexto.|ARQ-C4-1-contexto.png" \
              "Modelo C4, nivel 2: contenedores.|ARQ-C4-2-contenedores.png" \
              "Modelo C4, nivel 3: componentes de la API.|ARQ-C4-3-componentes.png" | bajar 1
  nota "$ROOT/05-Diseño/Arquitectura/ARQ — MVC y modelo conceptual por capa.md" \
    | titulo "MVC y modelo conceptual por capa" \
    | figuras "MVC en Rumbo.|ARQ-MVC.png" \
              "Registrar el cobro de un pago: Vista, Controlador y Modelo.|ARQ-MVC-secuencia-cobro.png" \
              "Modelo conceptual por capa.|ARQ-capas-conceptual.png" | bajar 1
  nota "$ROOT/05-Diseño/API/Contrato de la API (OpenAPI).md" | omitir "Cómo se edita|Supuestos|Relación con otras" \
    | titulo "Contrato de la API (OpenAPI)" | sin_enlaces_locales | sed 's| y de DEC-0005/0008||' | figuras | bajar 1
} > "$BUILD/60-arquitectura.md"

# --- Anexos ---------------------------------------------------------------------------------
desde_docx "$ROOT/07-Entregables/Requisitos/Rumbo — Requisitos.docx" m-req > "$BUILD/req.md"
desde_docx "$ROOT/07-Entregables/Casos de uso/Rumbo — Casos de uso.docx" m-cu > "$BUILD/cu.md"

{
  h1 "Anexo A. Especificación de requisitos"
  bajar 1 < "$BUILD/req.md"
  h1 "Anexo B. Especificación de casos de uso"
  bajar 1 < "$BUILD/cu.md"
} > "$BUILD/70-anexos-ab.md"

{
  h1 "Anexo C. Diagramas UML de estados, actividad y secuencia"
  printf '\n## Diagramas de estados\n\n'
  for e in Viaje Oportunidad Pago Cotización Alerta ContenidoRed; do
    nota "$D/Estados/EST-$e.md" \
      | omitir "Convenciones del diagrama|Para qué se creó|Huecos|Cambios de la sync|Fuentes" \
      | titulo "Estados de $e" | figuras "Diagrama de estados de $e.|EST-$e.png" | bajar 2
  done
  printf '\n## Diagramas de actividad\n\n'
  for a in "De la consulta a la venta|consulta-a-venta" "Confirmar reserva|confirmar-reserva" \
           "Registrar cobro de un pago|registrar-cobro" "Cancelar viaje|cancelar-viaje" \
           "Proceso automático diario|proceso-diario"; do
    n="${a%%|*}"; img="${a##*|}"
    nota "$D/Actividad/DGM-ACT — $n.md" | omitir "Convenciones del diagrama|Cómo mantenerlo" \
      | titulo "Actividad: $n" | figuras "Diagrama de actividad: $n.|DGM-ACT-$img.png" | bajar 2
  done
  printf '\n## Diagramas de secuencia\n\n'
  for a in "Confirmar reserva|confirmar-reserva" "Registrar cobro de un pago|registrar-cobro" "Cancelar viaje|cancelar-viaje"; do
    n="${a%%|*}"; img="${a##*|}"
    nota "$D/Secuencia/DGM-SEC — $n.md" | omitir "Convenciones del diagrama|Cómo mantenerlo" \
      | titulo "Secuencia: $n" | figuras "Diagrama de secuencia: $n.|DGM-SEC-$img.png" | bajar 2
  done
} > "$BUILD/80-anexo-c.md"

{
  h1 "Anexo D. Script SQL del modelo de datos"
  printf 'Script `rumbo.sql` completo, validado en PostgreSQL 18.\n\n```sql\n'
  cat "$ROOT/05-Diseño/Datos/rumbo.sql"
  printf '\n```\n'
} > "$BUILD/90-anexo-d.md"

# Los pies de figura de los .docx sueltos traen su propia numeración («Figura 3. …»);
# en el documento único se sacan para que no se repitan los números.
for f in "$BUILD"/[0-9]*.md; do
  sed -i -E 's/!\[Figura [0-9]+\. /![/' "$f"
done

REF="${1:-$B/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$ROOT/07-Entregables/PC1/00 - Portada.md" \
  "$BUILD/10-sec1a3.md" "$BUILD/40-datos.md" "$BUILD/50-desarrollo.md" "$BUILD/60-arquitectura.md" \
  "$BUILD/70-anexos-ab.md" "$BUILD/80-anexo-c.md" "$BUILD/90-anexo-d.md" \
  --toc --toc-depth=2 -M toc-title="Índice" \
  --resource-path="$D/Clases:$D/DER:$D/Estados/img:$D/Actividad/img:$D/Secuencia/img:$A" \
  "${REFARG[@]}" \
  -o "$OUT"

if [ -n "$KEEP_BUILD" ]; then echo "Intermedios en: $BUILD"; else rm -rf "$BUILD"; fi
echo "OK -> $OUT"
