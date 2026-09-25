#!/usr/bin/env bash
# Renderiza a PNG los diagramas de actividad (DGM-ACT) desde su bloque Mermaid.
# Uso: desde la raíz del repo:  bash "07-Entregables/build/render-diagramas-actividad.sh"
# Requiere Node.js (npx). Salida: 02-Analisis/Diagramas de actividad/img/
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/02-Analisis/Diagramas de actividad"
OUT="$DIR/img"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

# $1 nota, $2 nombre del PNG. Toma el primer bloque mermaid de la nota.
render() {
  awk '/^```mermaid/{f=1; next} /^```/{if(f) exit} f' "$DIR/$1" > "$TMP/d.mmd"
  npx -y @mermaid-js/mermaid-cli -i "$TMP/d.mmd" -o "$OUT/$2.png" -b white -s 2 -q >/dev/null
  echo "OK  $2.png"
}

render "DGM-ACT — De la consulta a la venta.md" "DGM-ACT-consulta-a-venta"
render "DGM-ACT — Confirmar reserva.md"         "DGM-ACT-confirmar-reserva"
render "DGM-ACT — Registrar cobro de un pago.md" "DGM-ACT-registrar-cobro"
render "DGM-ACT — Cancelar viaje.md"            "DGM-ACT-cancelar-viaje"
render "DGM-ACT — Proceso automático diario.md" "DGM-ACT-proceso-diario"

rm -rf "$TMP"
