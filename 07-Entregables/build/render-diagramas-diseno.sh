#!/usr/bin/env bash
# Renderiza a PNG los diagramas de diseño (arquitectura e IA) desde sus bloques Mermaid.
# Uso: desde la raíz del repo:  bash "07-Entregables/build/render-diagramas-diseno.sh"
# Requiere Node.js (npx). Salida: 05-Diseño/Arquitectura/img/ y 05-Diseño/img/
# Al sumar un diagrama nuevo en 05-Diseño, agregar su línea abajo (el número es el orden del bloque mermaid en la nota).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIS="$ROOT/05-Diseño"
TMP="$(mktemp -d)"

# $1 nota (relativa a 05-Diseño/), $2 número de bloque mermaid dentro de la nota,
# $3 ruta del PNG sin extensión (relativa a 05-Diseño/).
render() {
  awk -v n="$2" '/^```mermaid/{c++; if(c==n){f=1; next}} /^```/{if(f){f=0}} f' "$DIS/$1" > "$TMP/d.mmd"
  mkdir -p "$(dirname "$DIS/$3")"
  npx -y @mermaid-js/mermaid-cli -i "$TMP/d.mmd" -o "$DIS/$3.png" -b white -s 2 -q >/dev/null
  echo "OK  $3.png"
}

render "Arquitectura/ARQ — Vista general.md" 1 "Arquitectura/img/ARQ-despliegue"
render "Arquitectura/ARQ — Vista general.md" 2 "Arquitectura/img/ARQ-monorepo"
render "Arquitectura/ARQ — Vista general.md" 3 "Arquitectura/img/ARQ-logica-capas"
render "Arquitectura/ARQ — Vista general.md" 4 "Arquitectura/img/ARQ-logica-modulos"
render "Arquitectura/ARQ — Vista general.md" 5 "Arquitectura/img/ARQ-C4-1-contexto"
render "Arquitectura/ARQ — Vista general.md" 6 "Arquitectura/img/ARQ-C4-2-contenedores"
render "Arquitectura/ARQ — Vista general.md" 7 "Arquitectura/img/ARQ-C4-3-componentes"
render "IA — Agentes del proyecto.md"        1 "img/IA-ciclo-de-trabajo"
render "Modelo de desarrollo.md"             1 "img/DES-iteraciones"
render "Modelo de desarrollo.md"             2 "img/DES-pipeline-calidad"

rm -rf "$TMP"
