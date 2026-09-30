#!/usr/bin/env bash
# Renderiza a PNG los diagramas del modelo de dominio desde sus bloques Mermaid:
# clases (4 bloques), ER y los 6 diagramas de estado.
# Uso: desde la raíz del repo:  bash "07-Entregables/build/render-diagramas-dominio.sh"
# Requiere Node.js (npx). Salida: Clases/, DER/ y Estados/img/ dentro de 03-Dominio/Diagramas/
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIAG="$ROOT/03-Dominio/Diagramas"
# htmlLabels=false: sin esto, mermaid-cli corta la última letra de cada texto en los
# diagramas de clases y ER (mide la fuente con una métrica y la dibuja con otra).
CFG="$DIAG/mermaid-config.json"
TMP="$(mktemp -d)"

# $1 nota, $2 número de bloque mermaid dentro de la nota, $3 ruta del PNG sin extensión
# (relativa a 03-Dominio/Diagramas/),
# $4 "cfg" para aplicar la configuración anterior,
# $5 (opcional) lado mayor del PNG en píxeles, para diagramas muy grandes.
render() {
  awk -v n="$2" '/^```mermaid/{c++; if(c==n){f=1; next}} /^```/{if(f){f=0}} f' "$1" > "$TMP/d.mmd"
  local extra=(); [ "$4" = "cfg" ] && extra=(-c "$CFG")
  # Por defecto, escala 2 (a escala 3 los diagramas de clases y ER superan el lienzo máximo).
  # Con escala 2, mermaid-cli limita el ancho a unos 1568 px y achica lo que no entra: el ER
  # (el más grande) quedaba ilegible al hacer zoom. Para esos casos se fija el tamaño con $5.
  local tam=(-s 2); [ -n "$5" ] && tam=(--size "$5")
  mkdir -p "$(dirname "$DIAG/$3")"
  npx -y @mermaid-js/mermaid-cli -i "$TMP/d.mmd" -o "$DIAG/$3.png" -b white "${tam[@]}" -q "${extra[@]}" >/dev/null
  echo "OK  $3.png"
}

C="$ROOT/03-Dominio/Diagramas/DGM — Diagrama de clases.md"
render "$C" 1 "Clases/DGM-clases" cfg
render "$C" 2 "Clases/DGM-clases-enums-1" cfg
render "$C" 3 "Clases/DGM-clases-enums-2" cfg
render "$C" 4 "Clases/DGM-clases-enums-3" cfg
render "$ROOT/03-Dominio/Diagramas/DGM-ER.md" 1 "DER/DGM-ER" cfg 6000
# Los de estado se renderizan bien sin la configuración.
for e in Viaje Oportunidad Pago Cotización Alerta ContenidoRed; do
  render "$ROOT/03-Dominio/Diagramas/Estados/EST-$e.md" 1 "Estados/img/EST-$e"
done

rm -rf "$TMP"
