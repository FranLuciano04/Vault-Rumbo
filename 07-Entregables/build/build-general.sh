#!/usr/bin/env bash
# Genera el DOCUMENTO GENERAL del proyecto para los profesores: reúne en un solo archivo el
# análisis y el diseño, con los diagramas UML y los de arquitectura más importantes.
#
#   1. Definición del problema ........ Propuestas iniciales y elección, Antecedentes y Justificación
#   2. El negocio y el relevamiento ... Circuito, necesidades relevadas (2.ª ronda) y Actores
#   3. Objetivos, alcance y límites
#   4. Requisitos ...................... los 155 RF, los 16 RNF y la matriz de trazabilidad
#   5. Casos de uso .................... diagrama, tabla resumen y los 31 CU especificados
#   6. Modelo UML ...................... clases, ER, estados, actividad y secuencia
#   7. Tecnologías ..................... stack e infraestructura (como resultado)
#   8. Arquitectura .................... capas, MVC, C4 y despliegue
#   9. Prototipo de interfaces ......... pantallas principales
#
# Queda afuera, a pedido del equipo (08/10/26): las decisiones de IA (van en su documento
# aparte), las decisiones internas (DEC, ARQ y demás referencias del vault), el script SQL,
# el contrato OpenAPI y el modelo de desarrollo.
#
# Todo sale de las notas del vault con el mismo filtro que el resto de los entregables, y de los
# textos propios del documento en 07-Entregables/General/ (portada, modelo UML y tecnologías).
# Uso, desde la raíz del repo:  bash "07-Entregables/build/build-general.sh"
# Requiere pandoc y, para el PDF, Microsoft Word. Cerrar el .docx y el .pdf antes de compilar.
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
B="$ROOT/07-Entregables/build"
T="$ROOT/07-Entregables/General"
BUILD="$(mktemp -d)"
OUT="${OUT_OVERRIDE:-$T/Rumbo — Documento general.docx}"

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

# --- Herramientas (las mismas de build-pc1.sh) ----------------------------------------------
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

# nota ARCHIVO: filtra una nota protegiendo el interior de sus bloques de código.
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

# titulo NUEVO: reemplaza el primer título # por NUEVO.
titulo() {
  awk -v t="$1" '/^# / && !h { print "# " t; h=1; next } {print}'
}

# figuras "pie|imagen[|ancho]" ...: cambia cada bloque Mermaid, en orden, por su PNG ya renderizado,
# y quita los blockquotes (notas internas) fuera de los bloques de código.
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

# bajar N: baja el nivel de los títulos (fuera de los bloques de código).
bajar() {
  awk -v n="$1" '/^```/{ code = !code } !code && /^#+ /{ printf "%s", substr("######", 1, n) } {print}'
}

# sin_emojis: quita los emojis decorativos de los títulos.
sin_emojis() {
  sed -E '/^#+ /s/[[:space:]]*(💰|📊|📅|🔁|📱|🔐)//g'
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

D="$ROOT/03-Dominio/Diagramas"
REL="$ROOT/01-Relevamiento"
ARQ="$ROOT/05-Diseño/Arquitectura/ARQ — Vista general.md"
MVC="$ROOT/05-Diseño/Arquitectura/ARQ — MVC y modelo conceptual por capa.md"

# --- 1. Definición del problema --------------------------------------------------------------
{
  h1 "1. Definición del problema"
  nota "$REL/Elección del proyecto.md" | titulo "Propuestas iniciales y elección del proyecto" | figuras | bajar 1
  nota "$REL/Antecedentes.md" | titulo "Antecedentes" | figuras | bajar 1
  nota "$REL/Justificación del sistema.md" | titulo "Justificación" | figuras | bajar 1
} > "$BUILD/10.md"

# --- 2. El negocio y el relevamiento -------------------------------------------------------------
{
  h1 "2. El negocio y el relevamiento"
  printf 'El relevamiento se hizo con una agencia de turismo PyME que hoy gestiona su negocio con papel, carpetas físicas y planillas. En una primera ronda se relevaron la forma de trabajo, los problemas y los módulos que necesita; en una segunda ronda, la agencia respondió a las preguntas que habían quedado abiertas sobre la economía de las operaciones, el tablero, los reportes, el recontacto de clientes, los avisos y el ingreso al sistema. Esta sección resume ambas.\n\n'
  nota "$REL/Circuito de la consulta a la venta.md" | figuras | bajar 1
  printf 'El diagrama de secuencia de este circuito está en la sección 6.\n\n'
  h2 "Necesidades relevadas con la agencia"
  nota "$REL/Relevamiento — respuestas de la agencia (17-09).md" | seccion '^## [1-6][.]' \
    | grep -v '^→' | sed -E 's/ \(fuera de PC1\)//; s/^## [1-6]\. /## /' | sin_emojis | figuras | bajar 1
  nota "$REL/Actores.md" | titulo "Actores" | sed -E '/^#+ /s/\*//g' | figuras | bajar 1
} > "$BUILD/20.md"

# --- 3. Objetivos, alcance y límites ---------------------------------------------------------------
{
  h1 "3. Objetivos, alcance y límites"
  nota "$REL/Objetivos del sistema.md" | titulo "Objetivos" | sed -E 's/[[:space:]]+→[[:space:]].*$//' | figuras | bajar 1
  nota "$REL/Alcance y fuera de alcance.md" | titulo "Alcance y límites del sistema" \
    | sed -E 's/^- (❌|✅) /- /' | figuras | bajar 1
} > "$BUILD/30.md"

# --- 4. Requisitos -----------------------------------------------------------------------------------
{
  h1 "4. Requisitos"
  nota "$ROOT/02-Analisis/Requisitos funcionales.md" | titulo "Introducción" \
    | sed -E 's/están definidos en el \*\*documento de relevamiento\*\*, y no se repiten acá para que exista una sola fuente/están definidos en la **sección 3** de este documento/' \
    | bajar 1
  h2 "Regla de negocio RN-01: comisión automática"
  nota "$ROOT/02-Analisis/Reglas de negocio/RN-01 Comisión automática.md" | seccion "Enunciado|Fórmula|Restricciones" \
    | figuras | bajar 1
} > "$BUILD/40.md"

# --- 5. Casos de uso -----------------------------------------------------------------------------
{
  h1 "5. Casos de uso"
  printf 'Los casos de uso son la **realización** de los requisitos de la sección 4: describen cómo se concreta cada uno en la interacción entre los actores y el sistema. CU-01 es el circuito completo de la consulta a la venta, y los demás lo componen.\n\n'
  h2 "Diagrama de casos de uso"
  printf 'El sistema tiene **31 casos de uso** en once módulos. `Admin`, `Dueño` y `Freelance` son especializaciones del `Empleado`: heredan sus casos operativos, y solo se dibujan aparte los que son exclusivos de cada uno. El freelance, además, no gestiona hoteles, no registra reseñas y no usa el módulo de redes. El pasajero es actor externo: recibe la cotización y aporta la reseña, pero no opera el sistema.\n\n'
  printf '![Diagrama de casos de uso.](DGM-casos-de-uso.png){ height=8.5in }\n\n'
  h2 "Resumen de los casos de uso"
  tabla_cu
  printf '\nLos diagramas de actividad y de secuencia de los casos de uso centrales (CU-01, CU-07, CU-12 y CU-27) están en la sección 6.\n\n'
  for f in "$ROOT/02-Analisis/Casos de uso/"CU-*.md; do
    nota "$f" | sed -E 's/^-[[:space:]]*$/Ninguno./' | figuras | bajar 1
    printf '\n'
  done
} > "$BUILD/50.md"

# --- 6. Modelo UML -----------------------------------------------------------------------------------
# El texto vive en General/60; cada marca @@ESTADOS nota@@ se cambia por la tabla de estados de esa nota.
while IFS= read -r linea; do
  if [[ "$linea" =~ ^@@ESTADOS\ (.+)@@$ ]]; then
    nota "$D/Estados/${BASH_REMATCH[1]}.md" | seccion '^## Estados' sin | figuras
  else
    printf '%s\n' "$linea"
  fi
done < "$T/60 - Modelo UML.md" > "$BUILD/60.md"

# --- 7. Tecnologías ------------------------------------------------------------------------------------
cp "$T/70 - Tecnologías.md" "$BUILD/70.md"

# --- 8. Arquitectura -------------------------------------------------------------------------------
{
  h1 "8. Arquitectura"
  printf 'Esta sección presenta los diagramas de arquitectura principales: el modelo conceptual por capas, el patrón Modelo-Vista-Controlador aplicado al sistema, el modelo C4 en sus tres niveles y la vista de despliegue.\n\n'
  nota "$MVC" | seccion "Modelo conceptual por capa" \
    | sed -E 's/, con el esquema escrito en Modelo de datos SQL a partir del DGM-ER\. En el PC2, la primera migración de Alembic lo reproduce\./, con el esquema derivado del modelo entidad-relación de la sección 6. Las migraciones de Alembic lo reproducen./' \
    | figuras "Modelo conceptual por capa.|ARQ-capas-conceptual.png"
  nota "$MVC" | seccion "MVC en Rumbo" \
    | sed -E 's/\| Capa de ARQ — Vista general \|/| Capa |/' \
    | figuras "MVC en Rumbo.|ARQ-MVC.png"
  nota "$ARQ" | seccion "Modelo C4" \
    | sed -e 's/ Resume en ese formato lo que las vistas de arriba muestran en detalle\.//' \
          -e 's/ Mermaid tiene un tipo de diagrama C4 propio, pero todavía es experimental y se lee mal impreso, así que se dibuja con diagramas de flujo y los colores habituales de C4:/ Los colores son los habituales de C4:/' \
          -e 's/^Reúne la \*Vista lógica del backend\* en formato C4: cada caja/Cada caja/' \
          -e '/^- La tabla de paquetes, las reglas transversales y los once módulos/d' \
          -e 's/ según el Contrato de la API (OpenAPI)\./ según el contrato de la API./' \
    | figuras "Modelo C4, nivel 1: contexto.|ARQ-C4-1-contexto.png" \
              "Modelo C4, nivel 2: contenedores.|ARQ-C4-2-contenedores.png" \
              "Modelo C4, nivel 3: componentes de la API.|ARQ-C4-3-componentes.png"
  nota "$ARQ" | seccion "Vista de despliegue" \
    | sed -E 's/; la caja punteada es lo que se difiere a PC2\./; la caja punteada es el respaldo externo, previsto para una etapa posterior./' \
    | figuras "Vista de despliegue.|ARQ-despliegue.png"
} > "$BUILD/80.md"

# --- 9. Prototipo de interfaces ------------------------------------------------------------------
{
  h1 "9. Prototipo de interfaces"
  printf 'La interfaz se diseñó como un **prototipo navegable en Figma** ([Rumbo — Prototipo](https://www.figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp)), con 59 pantallas que cubren los casos de uso y las vistas de cada rol, en web y en mobile. Estas son las principales.\n\n'
  for s in "01-cu24-inicio-sesion.png|Inicio de sesión — CU-24" \
           "03-cu14-agenda.png|Agenda de alertas del día — CU-14" \
           "10-cu03-ficha-cliente.png|Ficha del cliente — CU-03" \
           "12-cu05-embudo.png|Embudo de oportunidades — CU-05" \
           "13-cu06-emitir-cotizacion.png|Emitir cotización — CU-06" \
           "15-cu07-10-11-ficha-viaje.png|Ficha del viaje, con su economía y el plan de cuotas — CU-07, CU-10 y CU-11" \
           "18-cu12-registrar-cobro.png|Registrar cobro — CU-12" \
           "21-cu18-catalogo-hoteles.png|Catálogo de hoteles — CU-18" \
           "28-cu21-dashboard.png|Dashboard de la dueña — CU-21" \
           "46-freelance-dashboard.png|Dashboard del freelance: solo sus ventas y comisiones — CU-21"; do
    printf '![%s.](%s){ width=100%% }\n\n' "${s#*|}" "${s%%|*}"
  done
  printf '![Mobile: agenda del día — CU-14.](35-mobile-agenda.png){ width=30%% } ![Mobile: clientes — CU-03.](57-mobile-clientes.png){ width=30%% }\n\n'
} > "$BUILD/90.md"

# Los nombres de notas del vault que quedan en el texto se cambian por la sección del documento.
# Pandoc exige una línea en blanco antes de cada título: se agrega donde falte al unir bloques.
for f in "$BUILD"/[0-9]*.md; do
  sed -E -e 's/ Junto con Objetivos del sistema, Justificación del sistema y Alcance y fuera de alcance completa la presentación general del proyecto\.//' \
         -e 's/([Vv])er Alcance y fuera de alcance/\1er la sección 3/g' \
         -e 's/Alcance y fuera de alcance/sección 3/g' \
         -e 's/los casos de uso de MOC — Casos de uso/los casos de uso de la sección 5/' \
         -e 's/ \(DGM-ACT — Proceso automático diario\)/ (diagrama de actividad de la sección 6)/' \
         -e 's/Relevamiento — Fuente de verdad/el relevamiento/g' "$f" \
  | awk '/^```/{ code = !code } !code && /^#+ / && prev != "" { print "" } { print; prev = $0 }' > "$f.tmp" && mv "$f.tmp" "$f"
done

IMGS=("$D/Clases" "$D/DER" "$D/Estados/img" "$D/Actividad/img" "$D/Secuencia/img" "$ROOT/05-Diseño/Arquitectura/img" \
      "$ROOT/07-Entregables/Prototipo/img" "$ROOT/07-Entregables/Casos de uso/img" "$ROOT/07-Entregables/Relevamiento/img")

# Ninguna imagen más alta que la hoja: las que se pasan poco se achican y los diagramas largos
# (los de actividad) se parten en tramos de una hoja, en $BUILD/img.
win_lista() { local s="" p; for p in "$@"; do s="$s|$(cygpath -w "$p")"; done; printf '%s' "${s#|}"; }
MSYS2_ARG_CONV_EXCL="*" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$B/ajustar-imagenes.ps1")" \
  -Markdown "$(win_lista "$BUILD"/[0-9]*.md)" -Rutas "$(win_lista "${IMGS[@]}")" -Salida "$(cygpath -w "$BUILD/img")"

REF="${1:-$B/reference.docx}"
REFARG=(); [ -f "$REF" ] && REFARG=(--reference-doc="$REF")

RUTAS="$BUILD/img"; for p in "${IMGS[@]}"; do RUTAS="$RUTAS:$p"; done

"$PANDOC" \
  "$T/00 - Portada.md" "$BUILD/10.md" "$BUILD/20.md" "$BUILD/30.md" "$BUILD/40.md" \
  "$BUILD/50.md" "$BUILD/60.md" "$BUILD/70.md" "$BUILD/80.md" "$BUILD/90.md" \
  --toc --toc-depth=2 -M toc-title="Índice" \
  --resource-path="$RUTAS" \
  "${REFARG[@]}" \
  -o "$OUT"

# Bordes en los cuadros, igual que el documento del PC1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$B/bordes-tablas.ps1")" \
  -Docx "$(cygpath -w "$OUT")" -Centrar "Necesidad de la agencia"

# PDF con Word (actualiza el índice antes de exportar).
if [ -z "$NO_PDF" ] && command -v powershell.exe >/dev/null 2>&1; then
  DOCX="$(cygpath -w "$OUT")"
  powershell.exe -NoProfile -Command "\$w = New-Object -ComObject Word.Application; \$w.Visible = \$false; \$d = \$w.Documents.Open('$DOCX'); \$d.TablesOfContents | ForEach-Object { \$_.Update() }; \$d.Save(); \$d.ExportAsFixedFormat(('$DOCX' -replace '\.docx$', '.pdf'), 17); \$d.Close(); \$w.Quit()" >/dev/null \
    && echo "PDF generado." || echo "AVISO: no se pudo exportar el PDF con Word."
fi

if [ -n "$KEEP_BUILD" ]; then echo "Intermedios en: $BUILD"; else rm -rf "$BUILD"; fi
echo "OK -> $OUT"
