#!/usr/bin/env sh
# Falla si algún contenedor del proyecto Compose publica un puerto fuera de 127.0.0.1.
# Uso: sh src/infra/chequear-puertos.sh [proyecto]   (por defecto: rumbo). T-135, DEC-0011.
proyecto="${1:-rumbo}"
publicados=$(docker ps --filter "label=com.docker.compose.project=$proyecto" --format '{{.Names}} {{.Ports}}')
[ -n "$publicados" ] || { echo "Sin contenedores del proyecto '$proyecto' en ejecución." >&2; exit 2; }
echo "$publicados"
# Docker muestra 0.0.0.0:p->c o [::]:p->c cuando publica en todas las interfaces.
if echo "$publicados" | grep -Eq '(^|[ ,])(0\.0\.0\.0|\[::\]):[0-9]+->'; then
  echo "FALLA: hay puertos publicados en todas las interfaces." >&2
  exit 1
fi
echo "OK: ningún puerto publicado fuera de 127.0.0.1."
