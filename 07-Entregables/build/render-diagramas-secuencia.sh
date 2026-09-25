#!/usr/bin/env bash
# Renderiza a PNG los diagramas de secuencia (DGM-SEC) de análisis desde su bloque Mermaid.
# Uso: desde la raíz del repo:  bash "07-Entregables/build/render-diagramas-secuencia.sh"
# Requiere Node.js (npx). Salida: 02-Analisis/Diagramas de secuencia/img/
# No incluye DGM-SEC — De la consulta a la venta (vista de negocio, sigue en 02-Analisis/).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/02-Analisis/Diagramas de secuencia"
OUT="$DIR/img"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

# $1 nota, $2 nombre del PNG. Toma el primer bloque mermaid de la nota.
render() {
  awk '/^```mermaid/{f=1; next} /^```/{if(f) exit} f' "$DIR/$1" > "$TMP/d.mmd"
  npx -y @mermaid-js/mermaid-cli -i "$TMP/d.mmd" -o "$OUT/$2.png" -b white -s 2 -q >/dev/null
  echo "OK  $2.png"
}

render "DGM-SEC — Confirmar reserva.md"           "DGM-SEC-confirmar-reserva"
render "DGM-SEC — Registrar cobro de un pago.md"  "DGM-SEC-registrar-cobro"

rm -rf "$TMP"
