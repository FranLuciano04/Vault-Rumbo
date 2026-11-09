# Servidor on-premise de la agencia: instalación, actualización y recuperación

Runbook de T-135 (DEC-0011, RNF-13). Servidor objetivo: mini PC con **Ubuntu Server LTS** y UPS,
sin ningún puerto abierto a la red: el acceso de los usuarios entra por **Cloudflare Tunnel**
(T-136, fuera de este documento). El respaldo diario (T-138) tampoco está acá.

## Estado de la verificación

T-135 se hizo como **ensayo** en una PC con Windows 11 y Docker Desktop (09/11/26), porque todavía
no hay servidor. Cada paso está marcado:

- **[Ensayo OK]**: se ejecutó en Windows y funcionó.
- **[Pendiente en el servidor]**: es específico de Linux o del hardware; lo tiene que verificar quien
  tenga acceso al servidor real (pregunta abierta de la spec §10: cuándo y dónde está disponible).

Los criterios de T-135 «Docker instalado» y «sin puertos expuestos» quedan **a medias** hasta
repasar los pasos 1 a 4 en el servidor.

## 1. Sistema base y Docker [Pendiente en el servidor]

Ubuntu Server LTS actualizado, con el reloj sincronizado (el proceso diario corre a las 00:00 de
Argentina):

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone America/Argentina/Buenos_Aires
timedatectl                      # "System clock synchronized: yes"
```

Docker Engine y el plugin Compose desde el repositorio oficial de Docker (guía vigente:
<https://docs.docker.com/engine/install/ubuntu/>; no usar el paquete `docker.io` de Ubuntu):

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker        # arranca solo tras un corte de luz
docker compose version                    # el Compose de src/ pide v2
```

Los contenedores tienen `restart: unless-stopped`: con Docker habilitado en el arranque, Rumbo
vuelve solo cuando vuelve la luz.

## 2. Usuario de servicio [Pendiente en el servidor]

Un usuario sin contraseña de login que es dueño del repo y del `.env`. Pertenecer al grupo `docker`
equivale a ser root del servidor, así que ese usuario **no** se usa para trabajar a diario ni lleva
clave SSH de una persona; las personas administran con `sudo -u rumbo`.

```bash
sudo adduser --system --group --home /opt/rumbo --shell /bin/bash rumbo
sudo usermod -aG docker rumbo
sudo -u rumbo git clone <URL del repo privado> /opt/rumbo/app     # token de solo lectura (deploy key)
```

El runner self-hosted de GitHub Actions (deploy desde `main`, DEC-0011) se instala después con este
mismo usuario; es parte del ticket del despliegue, no de este.

## 3. Firewall sin puertos entrantes [Pendiente en el servidor]

Se niega todo lo entrante. El túnel es una conexión **saliente**, así que no hace falta abrir nada.
La única excepción es SSH para administrar, y solo desde la red local de la agencia:

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp    # ajustar a la LAN real
sudo ufw enable
sudo ufw status verbose
```

Dos advertencias:

- Docker publica puertos saltándose `ufw` (escribe sus propias reglas de `iptables`). Por eso el
  Compose **no depende del firewall**: `nginx` se publica solo en `127.0.0.1` y `postgres`, `api` y
  `scheduler` no se publican (paso 5). El firewall es una segunda capa.
- La entrada local directa a `nginx` como respaldo si se corta internet (DEC-0011) no es prioritaria;
  si se configura, será una decisión aparte, no se abre sola.

## 4. Secretos en el `.env` fuera del repo [Ensayo OK, permisos pendientes en el servidor]

Se parte de `src/.env.example`. El archivo real es `src/.env`, ignorado por Git, y nunca se commitea:

```bash
sudo -u rumbo cp /opt/rumbo/app/src/.env.example /opt/rumbo/app/src/.env
sudo -u rumbo chmod 600 /opt/rumbo/app/src/.env
sudo -u rumbo nano /opt/rumbo/app/src/.env
```

Qué cargar:

| Variable | Valor en el servidor |
|---|---|
| `RUMBO_DB_USER` | `rumbo` |
| `RUMBO_DB_PASSWORD` | clave **alfanumérica** larga y única (va dentro de la URL de la base): `openssl rand -hex 24` |
| `RUMBO_HTTP_PORT` | dejar el valor por defecto (80, solo en `127.0.0.1`) |
| `FIREBASE_PROJECT_ID`, `VITE_FIREBASE_*` | los del proyecto real de Firebase (ver `src/infra/firebase.md`) |
| `RUMBO_FIREBASE_CREDENCIALES` | ruta al JSON de la cuenta de servicio, **fuera del repo** (por ejemplo `/opt/rumbo/secretos/firebase.json`, `chmod 600`) |
| token de `cloudflared` | lo define T-136 |

Cuidados: sin esas variables el Compose se niega a arrancar (`RUMBO_DB_USER`/`RUMBO_DB_PASSWORD` son
obligatorias). Guardar una copia de los secretos en un gestor de contraseñas de la agencia, no en el
servidor solamente. Cambiar `RUMBO_DB_PASSWORD` **después** de la primera corrida no cambia la clave
dentro del volumen de PostgreSQL: hay que cambiarla también con `ALTER USER`.

## 5. Levantar Rumbo con el Compose de producción [Ensayo OK; Pendiente en el servidor]

Para producción con el proyecto real de Firebase se suma el override `docker-compose.firebase.yml`;
**nunca** el de e2e (`docker-compose.e2e.yml`: trae un emulador de auth con cuentas en memoria).

```bash
cd /opt/rumbo/app
sudo -u rumbo docker compose -f src/docker-compose.yml -f src/docker-compose.firebase.yml up -d --build
sudo -u rumbo docker compose -f src/docker-compose.yml -f src/docker-compose.firebase.yml ps
```

Salud esperada: `api` y `postgres` en `healthy`; `nginx` y `scheduler` en `Up`. Comprobación:

```bash
curl -s http://127.0.0.1/api/salud     # {"estado":"ok"}
curl -sI http://127.0.0.1/ | head -1   # HTTP/1.1 200 OK
sudo -u rumbo docker compose -f src/docker-compose.yml logs scheduler | tail   # "read crontab"
```

Qué publica el Compose (`src/docker-compose.yml`): solo `127.0.0.1:${RUMBO_HTTP_PORT:-80}->80` de
`nginx`. `cloudflared` (T-136) se sumará en la misma red del Compose y le habla a `nginx:80`, sin
publicar nada. Hasta que exista el túnel, la única forma de abrir la web es desde el propio servidor
(`curl` local o un túnel SSH: `ssh -L 8080:127.0.0.1:80 usuario@servidor`).

## 6. Prueba de «sin puertos expuestos» [Ensayo OK en Windows; Pendiente en el servidor]

Dos controles. El primero es el script del repo (mira lo que Docker publica, en cualquier sistema):

```bash
sh src/infra/chequear-puertos.sh            # proyecto "rumbo"; otro: sh ... rumbo-ensayo
# sale 0 y dice "OK: ningún puerto publicado fuera de 127.0.0.1", o sale 1 y dice "FALLA"
```

El segundo mira lo que escucha realmente el sistema en interfaces que no son loopback:

```bash
# Linux (servidor): lo único permitido es SSH (22) desde la LAN
sudo ss -tlnp | grep -vE '127\.0\.0\.1|\[::1\]'
# Windows (ensayo)
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalAddress -notin '127.0.0.1','::1' }
```

Desde **otra máquina de la red** (o desde afuera, con la IP pública) el puerto 80 y el 5432 tienen
que dar timeout o rechazo: `nc -vz <ip-del-servidor> 80 5432`. Esa prueba cruzada solo se puede
hacer en el servidor real **[Pendiente]**.

## 7. Actualizar [Ensayo OK el up --build; el deploy por runner, pendiente]

Manual (el runner de `main` hará lo mismo, es otro ticket):

```bash
cd /opt/rumbo/app
sudo -u rumbo git fetch && sudo -u rumbo git checkout main && sudo -u rumbo git pull --ff-only
sudo -u rumbo docker compose -f src/docker-compose.yml -f src/docker-compose.firebase.yml up -d --build --remove-orphans
sudo -u rumbo docker compose -f src/docker-compose.yml -f src/docker-compose.firebase.yml ps
sudo -u rumbo docker image prune -f        # libera imágenes viejas
```

La `api` corre `alembic upgrade head` al arrancar, así que las migraciones se aplican solas. Los datos
viven en el volumen `rumbo_rumbo_pgdata` y **no se tocan** al reconstruir. Antes de una actualización
con migraciones, hacer el respaldo (T-138 cuando exista; mientras tanto, `pg_dump` a mano, ver §8).
Volver atrás: `git checkout <commit anterior>` y repetir el `up -d --build` (las migraciones no se
deshacen solas: si la versión nueva migró, restaurar el volcado).

## 8. Recuperación

**Reinicio del servidor o corte de luz** [Pendiente en el servidor]: no hay que hacer nada; Docker
arranca al inicio y los contenedores vuelven por `restart: unless-stopped`. Verificar con `ps` y
`/api/salud`. Si el servidor estuvo apagado a las 00:00, dispararlo a mano (es idempotente):

```bash
sudo -u rumbo docker compose -f src/docker-compose.yml exec scheduler python -m rumbo.presentacion.jobs.diario
```

**Un servicio caído** [Ensayo OK]: `docker compose ... ps` y `logs <servicio>`; `up -d` lo recrea.

**Bajar y volver a subir sin perder datos** [Ensayo OK]: `docker compose -f src/docker-compose.yml down`
(sin `-v`) conserva el volumen. En el ensayo se creó una tabla, se hizo `down` y `up`, y el dato
seguía. **`down -v` borra la base: no usarlo en el servidor.**

**Reinstalar el servidor desde cero** [Pendiente en el servidor]: repetir los pasos 1 a 5 y restaurar
el último volcado. Mientras no exista T-138, el volcado manual es:

```bash
docker compose -f src/docker-compose.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" rumbo' > rumbo-$(date +%F).sql
# restaurar en una base vacía:
docker compose -f src/docker-compose.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" rumbo' < rumbo-AAAA-MM-DD.sql
```

La copia tiene que salir del servidor (RNF-08); el mecanismo automático es T-138.

## Lo que verificó el ensayo (Windows 11 + Docker Desktop, 09/11/26)

Con un `.env` de ensayo fuera del repo y el proyecto `rumbo-ensayo` (para no tocar los contenedores
de desarrollo): el Compose de producción construyó y levantó los cuatro servicios; `api` y `postgres`
`healthy`; `/api/salud` y la web respondieron 200 por `127.0.0.1`; `nginx` quedó publicado solo en
`127.0.0.1:8088`; `chequear-puertos.sh` salió 0; `up --build` repetido y `down` + `up` conservaron
los datos; el proceso diario corrió a mano. No se verificó nada de Linux, `ufw`, el usuario de
servicio, el arranque tras un reinicio real ni la prueba cruzada desde otra máquina.
