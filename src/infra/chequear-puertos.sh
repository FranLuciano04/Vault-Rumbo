#!/usr/bin/env sh
# Falla si algún contenedor del proyecto Compose publica un puerto en un host que no sea loopback
# (127.0.0.1 o [::1]): cualquier otra dirección (0.0.0.0, [::], :::, una IP de la LAN) es exposición.
# Uso: sh src/infra/chequear-puertos.sh [proyecto]   (por defecto: rumbo). T-135, DEC-0011.
# Para probarlo con salidas simuladas de `docker ps`: ... | sh src/infra/chequear-puertos.sh --stdin
if [ "${1:-}" = "--stdin" ]; then
  publicados=$(cat)
else
  proyecto="${1:-rumbo}"
  publicados=$(docker ps --filter "label=com.docker.compose.project=$proyecto" --format '{{.Names}} {{.Ports}}')
  [ -n "$publicados" ] || { echo "Sin contenedores del proyecto '$proyecto' en ejecución." >&2; exit 2; }
fi
echo "$publicados"
# Cada publicación es "host:puerto->destino/proto" (los no publicados, "8000/tcp", no tienen "->").
# Se descarta el nombre del contenedor y el puerto (rangos incluidos) y se mira solo el host.
expuestos=$(echo "$publicados" | tr ',' '\n' | grep -- '->' \
  | sed -e 's/^[^ ]* //' -e 's/^ *//' -e 's/->.*//' -e 's/:[0-9-]*$//' \
  | grep -vxE '127\.0\.0\.1|\[::1\]')
if [ -n "$expuestos" ]; then
  echo "FALLA: puertos publicados fuera de loopback (host): $(echo "$expuestos" | sort -u | tr '\n' ' ')" >&2
  exit 1
fi
echo "OK: ningún puerto publicado fuera de 127.0.0.1."
