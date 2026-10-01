#!/usr/bin/env bash
# Genera el DOCUMENTO PRINCIPAL del PC1: «Documento con el MVC», con el contenido que pide la
# cátedra y en su orden (decidido en la sync del 30/09/26, ver «Estado del proyecto», H3):
#
#   1. Definición del problema ........ Antecedentes y Justificación
#   2. Alcance y límites ............... Objetivos, Alcance, Actores y la tabla de casos de uso
#   3. Modelo conceptual ............... frontend, backend y base de datos, y las interfaces principales
#   4. Modelo de flujo ................. diagramas UML principales y C4
#   5. Modelo de datos SQL ............. ER, criterios y el script completo
#   6. Comunicación Vista–Controlador .. MVC y contrato OpenAPI (JSON)
#   7. Modelos y agentes de IA ......... modelo del producto, agentes y prompts
#   8. Modelado con Mermaid.js
#   Material complementario: la carpeta de entrega (armar-entrega.sh).
#
# Todo sale de las notas del vault, con el mismo filtro que el resto de los entregables, y de
# los textos propios del documento en 07-Entregables/PC1/ (portada y presentaciones de sección).
# Uso, desde la raíz del repo:  bash "07-Entregables/build/build-pc1.sh"
# Requiere pandoc (ver 00-Inicio/Skills compartidas.md). Cerrar el .docx en Word antes.
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
B="$ROOT/07-Entregables/build"
T="$ROOT/07-Entregables/PC1"
BUILD="$(mktemp -d)"
OUT="${OUT_OVERRIDE:-$T/Rumbo — PC1.docx}"

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
    s/([^[:space:]])[[:space:]]{2,}/\1 /g;
    s/[[:space:]]+,/,/g'
}

# nota ARCHIVO: filtra una nota protegiendo el interior de sus bloques de código, que el
# filtro compactaría (sangría del JSON, del SQL y de los prompts).
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

# seccion REGEX [sin-titulo]: deja solo las secciones ## cuyo título coincide con REGEX.
seccion() {
  awk -v re="$1" -v sint="$2" '
    /^```/{ code = !code }
    !code && /^#{1,2} /{ on = ($0 ~ /^## / && $0 ~ re) ? 1 : 0; if (on && sint != "") next }
    on{print}'
}

# omitir REGEX: descarta las secciones ## cuyo título coincide con REGEX.
omitir() {
  awk -v re="$1" '/^```/{ code = !code } !code && /^## /{ skip = ($0 ~ re) ? 1 : 0 } !code && /^# /{skip=0} skip==1{next} {print}'
}

# titulo NUEVO: reemplaza el primer título # por NUEVO.
titulo() {
  awk -v t="$1" '/^# / && !h { print "# " t; h=1; next } {print}'
}

# sin_titulo: quita el primer título # (el de la nota).
sin_titulo() {
  awk '/^# / && !h { h=1; next } {print}'
}

# figuras "pie|imagen[|ancho o atributo, p. ej. height=8.5in]" ...: cambia cada bloque Mermaid, en orden, por su PNG ya
# renderizado, y quita los blockquotes (notas internas) fuera de los bloques de código.
figuras() {
  awk -v lista="$(printf '%s\n' "$@")" '
    BEGIN{ split(lista, f, "\n"); k=0 }
    /^```mermaid/{ mer=1; k++; n=split(f[k], p, "|"); a = (n >= 3) ? p[3] : "100%"; if (a !~ /=/) a = "width=" a; if (p[2] != "") printf "![%s](%s){ %s }\n", p[1], p[2], a; next }
    mer==1 && /^```/{ mer=0; next }
    mer==1{next}
    /^```/{ code = !code }
    !code && /^>/{next}
    {print}'
}

# bajar N / subir N: cambia el nivel de los títulos (fuera de los bloques de código).
bajar() {
  awk -v n="$1" '/^```/{ code = !code } !code && /^#+ /{ printf "%s", substr("######", 1, n) } {print}'
}
subir() {
  awk -v n="$1" '/^```/{ code = !code } !code && /^#+ /{ match($0, /^#+/); if (RLENGTH > n) $0 = substr($0, n + 1) } {print}'
}

# Enlaces Markdown a archivos del vault (p. ej. [`rumbo.sql`](rumbo.sql)): queda el texto.
sin_enlaces_locales() {
  sed -E 's/\[(`?[^]]+`?)\]\(([^):]+\.(sql|json|js|md|py))\)/\1/g'
}

h1() { printf '\n# %s\n\n' "$1"; }
h2() { printf '\n## %s\n\n' "$1"; }

# Tabla de casos de uso: módulo según el MOC y actor principal según cada CU.
tabla_cu() {
  local moc="$ROOT/02-Analisis/MOC — Casos de uso.md" dir="$ROOT/02-Analisis/Casos de uso"
  printf '| Caso de uso | Módulo | Actor principal |\n|---|---|---|\n'
  awk '
    /^### /{ m=$0; sub(/^### /, "", m); sub(/ — .*/, "", m); sub(/ \/ Catálogos/, " y catálogos", m) }
    /^## Flujo núcleo/{ m="Circuito completo" }
    /^- \[\[CU-[0-9]+ /{ c=$0; sub(/^- \[\[/, "", c); sub(/\]\].*/, "", c); print c "\t" m }' "$moc" \
  | sort | while IFS=$'\t' read -r cu mod; do
      actor="$(awk '/^## Actor principal/{getline; print; exit}' "$dir/$cu.md" \
        | sed -E 's/\[\[Actores\|([^]]*)\]\]/\1/g; s/\[\[([^]|]*)\]\]/\1/g; s/\. No incluye.*//; s/ con acceso al módulo de redes/ (con acceso a redes)/; s/ \(rol operativo.*//; s/^ +| +$//g')"
      printf '| %s | %s | %s |\n' "$cu" "$mod" "${actor^}"
    done
}

# Operaciones del contrato por módulo, con ejemplos de rutas.
tabla_api() {
  node -e '
    const d = require(process.argv[1]);
    const por = {};
    for (const [ruta, ops] of Object.entries(d.paths))
      for (const [m, op] of Object.entries(ops)) {
        const t = (op.tags || ["otros"])[0];
        (por[t] = por[t] || []).push(m.toUpperCase() + " " + ruta);
      }
    const nombre = t => ({ economia: "Economía y pagos", configuracion: "Configuración y catálogos", oportunidades: "Oportunidades y cotización", hoteles: "Catálogo de hoteles", seguridad: "Usuarios y seguridad" })[t] || t.charAt(0).toUpperCase() + t.slice(1);
    console.log("| Módulo | Operaciones | Ejemplos |\n|---|---|---|");
    for (const t of (d.tags || []).map(x => x.name).filter(t => por[t]))
      console.log("| " + nombre(t) + " | " + por[t].length + " | `" + por[t].slice(0, 2).join("` · `").replace(/\{/g, "{").replace(/\|/g, "\\|") + "` |");
  ' "$ROOT/05-Diseño/API/openapi.json"
}

D="$ROOT/03-Dominio/Diagramas"
ARQ="$ROOT/05-Diseño/Arquitectura/ARQ — Vista general.md"
MVC="$ROOT/05-Diseño/Arquitectura/ARQ — MVC y modelo conceptual por capa.md"

# --- 1. Definición del problema --------------------------------------------------------------
{
  h1 "1. Definición del problema"
  nota "$ROOT/01-Relevamiento/Antecedentes.md" | titulo "Antecedentes" | figuras | bajar 1
  nota "$ROOT/01-Relevamiento/Justificación del sistema.md" | titulo "Justificación" | figuras | bajar 1
} > "$BUILD/10.md"

# --- 2. Alcance y límites ------------------------------------------------------------------------
{
  h1 "2. Alcance y límites"
  nota "$ROOT/01-Relevamiento/Objetivos del sistema.md" | titulo "Objetivos" | figuras | bajar 1
  nota "$ROOT/01-Relevamiento/Alcance y fuera de alcance.md" | titulo "Alcance y límites del sistema" \
    | sed -E 's/^- (❌|✅) /- /' | figuras | bajar 1
  nota "$ROOT/01-Relevamiento/Actores.md" | titulo "Actores" | figuras | bajar 1
  h2 "Casos de uso"
  printf 'El sistema tiene **31 casos de uso**. CU-01 es el circuito completo de la consulta a la venta, y los demás lo componen. La especificación de cada uno (precondiciones, flujos y postcondiciones) está en el anexo de casos de uso de la carpeta de entrega.\n\n'
  tabla_cu
} > "$BUILD/20.md"

# --- 3. Modelo conceptual -----------------------------------------------------------------------
{
  h1 "3. Modelo conceptual: frontend, backend y base de datos"
  nota "$MVC" | seccion "Modelo conceptual por capa" sin | figuras "Modelo conceptual por capa.|ARQ-capas-conceptual.png" | subir 1
  h2 "Interfaces principales del prototipo"
  printf 'El frontend se diseñó como un **prototipo navegable en Figma** ([Rumbo — Prototipo PC1](https://www.figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp)), con 59 pantallas que cubren los casos de uso y las vistas de cada rol. Estas son las principales; todas están en la carpeta de entrega y en el anexo de modelo de desarrollo.\n\n'
  for s in "03-cu14-agenda.png|Agenda de alertas del día — CU-14" "13-cu06-emitir-cotizacion.png|Emitir cotización — CU-06" \
           "15-cu07-10-11-ficha-viaje.png|Ficha del viaje, con su economía y el plan de cuotas — CU-07, CU-10 y CU-11" \
           "18-cu12-registrar-cobro.png|Registrar cobro — CU-12" "28-cu21-dashboard.png|Dashboard de la dueña — CU-21" \
           "46-freelance-dashboard.png|Dashboard del freelance: solo sus ventas y comisiones — CU-21 A1"; do
    printf '![%s.](%s){ width=100%% }\n\n' "${s#*|}" "${s%%|*}"
  done
  printf '![Mobile: agenda del día — CU-14.](35-mobile-agenda.png){ width=30%% } ![Mobile: clientes — CU-03.](57-mobile-clientes.png){ width=30%% }\n\n'
} > "$BUILD/30.md"

# --- 4. Modelo de flujo: UML y C4 --------------------------------------------------------------
{
  h1 "4. Modelo de flujo: gráficos UML y C4"
  cat "$T/40 - Modelo de flujo.md"
  nota "$ARQ" | seccion "Modelo C4" \
    | figuras "Modelo C4, nivel 1: contexto.|ARQ-C4-1-contexto.png" \
              "Modelo C4, nivel 2: contenedores.|ARQ-C4-2-contenedores.png" \
              "Modelo C4, nivel 3: componentes de la API.|ARQ-C4-3-componentes.png"
  nota "$ARQ" | seccion "Vista de despliegue" | figuras "Vista de despliegue.|ARQ-despliegue.png"
} > "$BUILD/40.md"

# --- 5. Modelo de datos SQL ----------------------------------------------------------------------
{
  h1 "5. Modelo de datos SQL"
  h2 "Modelo entidad-relación"
  nota "$D/DGM-ER.md" | seccion "Convenciones" sin | figuras "Modelo entidad-relación.|DGM-ER.png"
  nota "$ROOT/05-Diseño/Datos/Modelo de datos SQL.md" | sin_titulo | sin_enlaces_locales | omitir "En PC2" | figuras
  h2 "Script SQL"
  printf 'Script `rumbo.sql` completo, validado en PostgreSQL 18.\n\n```sql\n'
  cat "$ROOT/05-Diseño/Datos/rumbo.sql"
  printf '\n```\n'
} > "$BUILD/50.md"

# --- 6. Comunicación Vista–Controlador -----------------------------------------------------------
{
  h1 "6. Comunicación Vista–Controlador: OpenAPI en JSON"
  nota "$MVC" | seccion "MVC en Rumbo|Comunicación entre Vista y Controlador" \
    | figuras "MVC en Rumbo.|ARQ-MVC.png" "Registrar el cobro de un pago: Vista, Controlador y Modelo.|ARQ-MVC-secuencia-cobro.png"
  h2 "Contrato OpenAPI"
  nota "$ROOT/05-Diseño/API/Contrato de la API (OpenAPI).md" | seccion "Qué es y qué no es|Convenciones|Autenticación y roles|Errores" \
    | sin_enlaces_locales | sed 's| y de DEC-0005/0008||' | figuras | bajar 1
  printf '\n### Operaciones por módulo\n\nEl contrato completo, con los esquemas JSON de cada operación, es el archivo `openapi.json` de la carpeta de entrega.\n\n'
  tabla_api
} > "$BUILD/60.md"

# --- 7. Modelos y agentes de IA, con sus prompts -------------------------------------------------
{
  h1 "7. Selección de modelos y agentes de IA, con sus prompts"
  nota "$ROOT/05-Diseño/Decisiones/DEC-0012 Modelo de IA del producto.md" | titulo "Modelo de IA del producto" \
    | omitir "Impacto|Decisores|Vínculo" | sed -E 's/\| ✅ \|/| Sí |/g; s/\| ❌ \|/| No |/g' | figuras | bajar 1
  nota "$ROOT/05-Diseño/IA — Agentes del proyecto.md" | titulo "Agentes de IA del proyecto" | omitir "IA dentro del producto" \
    | figuras "Ciclo de trabajo de una sesión con el agente.|IA-ciclo-de-trabajo.png|height=8.5in" | bajar 1
  cat "$T/75 - Prompts de los agentes.md"
} > "$BUILD/70.md"

# --- 8. Modelado con Mermaid.js ----------------------------------------------------------------
{
  h1 "8. Modelado con Mermaid.js"
  cat "$T/80 - Modelado con Mermaid.md"
  cat "$T/90 - Material complementario.md"
} > "$BUILD/80.md"

# Pandoc exige una línea en blanco antes de cada título: se agrega donde falte al unir bloques.
for f in "$BUILD"/[0-9]*.md; do
  awk '/^```/{ code = !code } !code && /^#+ / && prev != "" { print "" } { print; prev = $0 }' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

REF="${1:-$B/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

"$PANDOC" \
  "$T/00 - Portada.md" "$BUILD/10.md" "$BUILD/20.md" "$BUILD/30.md" "$BUILD/40.md" \
  "$BUILD/50.md" "$BUILD/60.md" "$BUILD/70.md" "$BUILD/80.md" \
  --toc --toc-depth=2 -M toc-title="Índice" \
  --resource-path="$D/Clases:$D/DER:$D/Estados/img:$D/Actividad/img:$D/Secuencia/img:$ROOT/05-Diseño/Arquitectura/img:$ROOT/05-Diseño/img:$ROOT/07-Entregables/Prototipo/img:$ROOT/07-Entregables/Casos de uso/img:$ROOT/07-Entregables/Relevamiento/img" \
  "${REFARG[@]}" \
  -o "$OUT"

if [ -n "$KEEP_BUILD" ]; then echo "Intermedios en: $BUILD"; else rm -rf "$BUILD"; fi
echo "OK -> $OUT"
