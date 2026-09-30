#!/usr/bin/env bash
# Arma la CARPETA DE ENTREGA del PC1, ordenada para subirla al Drive (decidido en la sync del
# 30/09/26): el documento principal, la presentación, los anexos, todos los diagramas, todas las
# pantallas del prototipo, el contrato OpenAPI, el script SQL y las instrucciones del agente.
# La estructura es la que describe «90 - Material complementario.md».
#
# Primero regenera los .docx sueltos (anexos) y el documento principal, y exporta los PDF con Word.
# La carpeta queda en 07-Entregables/PC1/Rumbo — Entrega PC1/ y está fuera de Git (.gitignore):
# se vuelve a armar cuando haga falta. La presentación se toma tal como está en PC1/.
# Uso, desde la raíz del repo:  bash "07-Entregables/build/armar-entrega.sh"
# Requiere pandoc y, para los PDF, Microsoft Word. Cerrar los documentos en Word antes.
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
B="$ROOT/07-Entregables/build"
E="$ROOT/07-Entregables"
OUT="$E/PC1/Rumbo — Entrega PC1"

# --- Regenerar todo ---------------------------------------------------------------------------
for s in relevamiento requisitos casos-de-uso ia desarrollo pc1; do
  bash "$B/build-$s.sh" >/dev/null
done

rm -rf "$OUT"
mkdir -p "$OUT/01 - Documento principal" "$OUT/02 - Presentación" "$OUT/03 - Anexos" \
         "$OUT/04 - Diagramas" "$OUT/05 - Prototipo/Pantallas" "$OUT/06 - API" "$OUT/07 - Base de datos" "$OUT/08 - Agentes"

# --- 01 y 02 ------------------------------------------------------------------------------------
cp "$E/PC1/Rumbo — PC1.docx" "$OUT/01 - Documento principal/"
for f in "$E/PC1/Rumbo — PC1 (presentación)".pptx "$E/PC1/Rumbo — PC1 (presentación)".pdf; do
  [ -f "$f" ] && cp "$f" "$OUT/02 - Presentación/"
done

# --- 03 · Anexos, numerados en el orden de lectura ------------------------------------------------
cp "$E/Relevamiento/Rumbo — Relevamiento.docx"           "$OUT/03 - Anexos/A - Rumbo — Relevamiento.docx"
cp "$E/Requisitos/Rumbo — Requisitos.docx"               "$OUT/03 - Anexos/B - Rumbo — Requisitos.docx"
cp "$E/Casos de uso/Rumbo — Casos de uso.docx"           "$OUT/03 - Anexos/C - Rumbo — Casos de uso.docx"
cp "$E/IA/Rumbo — Inteligencia artificial.docx"          "$OUT/03 - Anexos/D - Rumbo — Inteligencia artificial.docx"
cp "$E/Desarrollo/Rumbo — Modelo de desarrollo.docx"     "$OUT/03 - Anexos/E - Rumbo — Modelo de desarrollo e interfaces.docx"

# --- 04 · Diagramas, una subcarpeta por tipo -------------------------------------------------------
D="$ROOT/03-Dominio/Diagramas"
mkdir -p "$OUT/04 - Diagramas/"{"1 - Casos de uso","2 - Clases","3 - Entidad-relación","4 - Estados","5 - Actividad","6 - Secuencia","7 - Arquitectura y C4","8 - Proceso de trabajo"}
cp "$E/Casos de uso/img/"*.png                 "$OUT/04 - Diagramas/1 - Casos de uso/"
cp "$D/Clases/"*.png                           "$OUT/04 - Diagramas/2 - Clases/"
cp "$D/DER/"*.png                              "$OUT/04 - Diagramas/3 - Entidad-relación/"
cp "$D/Estados/img/"*.png                      "$OUT/04 - Diagramas/4 - Estados/"
cp "$D/Actividad/img/"*.png                    "$OUT/04 - Diagramas/5 - Actividad/"
cp "$D/Secuencia/img/"*.png "$E/Relevamiento/img/"*.png "$ROOT/05-Diseño/Arquitectura/img/ARQ-MVC-secuencia-cobro.png" \
                                               "$OUT/04 - Diagramas/6 - Secuencia/"
for f in "$ROOT/05-Diseño/Arquitectura/img/"*.png; do
  [ "$(basename "$f")" = "ARQ-MVC-secuencia-cobro.png" ] || cp "$f" "$OUT/04 - Diagramas/7 - Arquitectura y C4/"
done
cp "$ROOT/05-Diseño/img/"*.png                 "$OUT/04 - Diagramas/8 - Proceso de trabajo/"

# --- 05 a 08 --------------------------------------------------------------------------------------
cp "$E/Prototipo/img/"*.png "$OUT/05 - Prototipo/Pantallas/"
printf 'Prototipo navegable en Figma:\r\nhttps://www.figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp\r\n\r\nPara recorrerlo: Present y, en Opciones, «Ajustar». Hay un punto de inicio por perfil: escritorio (empleado), mobile, dueña, administrador y freelance.\r\n' \
  > "$OUT/05 - Prototipo/Enlace al prototipo en Figma.txt"
cp "$ROOT/05-Diseño/API/openapi.json" "$OUT/06 - API/"
cp "$ROOT/05-Diseño/Datos/rumbo.sql"  "$OUT/07 - Base de datos/"
cp "$ROOT/CLAUDE.md"                   "$OUT/08 - Agentes/"

# --- PDF del documento principal (Word) ---------------------------------------------------------------
if command -v powershell.exe >/dev/null 2>&1; then
  DOCX="$(cygpath -w "$OUT/01 - Documento principal/Rumbo — PC1.docx")"
  powershell.exe -NoProfile -Command "\$w = New-Object -ComObject Word.Application; \$w.Visible = \$false; \$d = \$w.Documents.Open('$DOCX'); \$d.TablesOfContents | ForEach-Object { \$_.Update() }; \$d.Save(); \$d.ExportAsFixedFormat(('$DOCX' -replace '\.docx$', '.pdf'), 17); \$d.Close(); \$w.Quit()" >/dev/null \
    && echo "PDF del documento principal generado." || echo "AVISO: no se pudo exportar el PDF con Word."
fi

echo "OK -> $OUT"
find "$OUT" -type f | sed "s|$OUT/||" | sort | awk -F/ '{print $1}' | uniq -c
