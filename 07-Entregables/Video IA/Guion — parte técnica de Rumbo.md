---
tipo: referencia
estado: borrador
responsable: Nahuel
actualizado: 19/11/26
---
# Guion — parte técnica de Rumbo

tags:: #tipo/referencia #estado/borrador

> Guion del segundo video para los profesores: stack tecnológico, diagramas de arquitectura principales y una demo en la que se crea un dato en la app y se ve cómo queda en la base. Complementa [[Guion — uso de la IA en Rumbo]]. **Borrador:** el reparto de bloques es una propuesta a confirmar con el equipo.

## Datos generales
- **Duración objetivo:** unos 15 minutos.
- **Hilo conductor:** seguir un dato de punta a punta: desde un clic en la web, pasando por la API y sus tres capas, hasta una fila en PostgreSQL.
- **Grabación y edición:** igual que el otro video: OBS Studio, un archivo por bloque, y Clipchamp para unirlos.
- **Fuentes:** [[DEC-0001 Stack tecnológico]], [[ARQ — Vista general]], [[DGM-ER]], [[EST-Oportunidad]] y [[Spec de implementación]] (sección 4, comandos).

## Reparto propuesto (a confirmar)
| Bloque | Quién |
|---|---|
| 1, 2 y 3 | Nahuel (propuso el stack en DEC-0001) |
| 4 | Francisco |
| 5 y 6 | Paloma |
| 7 | Nahuel |

## Preparación antes de grabar
- [ ] **Entorno local levantado** con los datos de demo (comandos de la sección 4 de la [[Spec de implementación]]):
  - `docker compose -f src/docker-compose.dev.yml up -d` (PostgreSQL)
  - El Auth Emulator de Firebase
  - Desde `src/backend`: `uv run alembic upgrade head`, `uv run python -m rumbo.presentacion.cli datos-iniciales --demo` y `uv run fastapi dev rumbo/main.py`
  - Desde `src`: `pnpm --filter @rumbo/web dev`
- [ ] Probar el recorrido de la demo (bloque 6) una vez completo **antes** de grabar.
- [ ] **Cliente para ver la base:** DBeaver (gratis), conectado a `127.0.0.1:5432`, base `rumbo`. Como alternativa, `psql` dentro del contenedor (`docker exec -it rumbo-postgres-dev psql -U <usuario> -d rumbo`). Dejar las consultas del bloque 6 escritas en una pestaña.
- [ ] Tener abiertas las imágenes de `05-Diseño/Arquitectura/img/` o las notas con el Mermaid renderizado en Obsidian.
- [ ] Abrir Swagger en `http://localhost:8000/api/docs`.
- [ ] **Ocultar secretos:** no mostrar `src/.env` ni la contraseña de la base en la conexión de DBeaver. Ocultar la clave de NVIDIA.
- [ ] Usar solo datos de demo o inventados en el video, nunca datos reales de la agencia.

---

## Bloque 1 — Intro (0,5 min)
**En pantalla:** escena «Cámara».

**Narración:**
> En este video mostramos cómo está construido Rumbo por dentro: con qué tecnologías, cómo se organiza la arquitectura y, al final, vamos a crear un cliente y una consulta en la web y seguirlos hasta la base de datos.

## Bloque 2 — Stack tecnológico (2,5 min)
**En pantalla:** [[DEC-0001 Stack tecnológico]] y la tabla «Resumen» de [[ARQ — Vista general]]. En el editor, el árbol de `src/`.

**Narración:**
> Rumbo es una aplicación cliente-servidor. Hay dos clientes: una web para la gestión completa y una app mobile para la agenda, las alertas y los clientes. Los dos hablan en JSON con una única API, que es la dueña de las reglas del negocio y de la base.
>
> El backend está en Python con FastAPI, que nos genera el contrato OpenAPI automáticamente. La base es PostgreSQL, a la que accedemos con SQLAlchemy asíncrono, y los cambios de esquema se versionan con migraciones de Alembic.
>
> La web está hecha con React, TypeScript y Vite, y la mobile con React Native y Expo. Comparten un paquete en TypeScript con los tipos generados desde el contrato de la API, validaciones con zod y el acceso a la API con Axios y TanStack Query. Así, si cambia la API, el front deja de compilar en lugar de fallar en producción.
>
> La autenticación la resuelve Firebase, pero los roles y los permisos se manejan en Rumbo. La IA del producto se usa para los borradores de contenido para redes, con LangChain. Todo está en un monorepo, dentro de `src`: `apps/web`, `apps/mobile`, `packages/shared` y `backend`.
>
> Para la calidad, cada parte tiene su linter, su chequeo de tipos y sus tests: pytest en el backend, Vitest y Playwright en la web y Jest en mobile. Además, el CI de GitHub Actions corre análisis de seguridad: pip-audit, pnpm audit, bandit, Semgrep y gitleaks.

**Edición:** una placa con los logos agrupados por capa: clientes, compartido, API, datos y servicios externos.

## Bloque 3 — Despliegue (1,5 min)
**En pantalla:** el diagrama de despliegue (`ARQ-despliegue.png`) y el C4 de nivel 1 (`ARQ-C4-1-contexto.png`).

**Narración:**
> Según lo que necesita la agencia, el sistema corre en un servidor propio dentro de la agencia, no en la nube. Es un Ubuntu Server con Docker Compose y una UPS. Ahí corren la API, la base, nginx, un contenedor con cron que ejecuta el proceso diario, y `cloudflared`.
>
> Los usuarios entran por un túnel de Cloudflare: la conexión sale desde el servidor hacia la nube, así que el router de la agencia no expone ningún puerto. El proceso diario corre todos los días a medianoche: vence pagos y cotizaciones y genera alertas, usando los mismos servicios que la API.
>
> El C4 de contexto muestra los actores, que son la dueña, los empleados, los vendedores freelance y el administrador, y los sistemas externos: Firebase para la autenticación y el proveedor de IA.

## Bloque 4 — Arquitectura del backend (2,5 min)
**En pantalla:** `ARQ-logica-capas.png`, `ARQ-logica-modulos.png` y, en el editor, las carpetas `src/backend/rumbo/presentacion`, `negocio`, `datos` y `core`.

**Narración:**
> La API sigue un modelo de tres capas. Presentación recibe el pedido HTTP y valida el formato. Negocio aplica las reglas. Datos habla con la base. Cada capa solo usa la de abajo: un router nunca llama directamente a un repositorio. Aparte hay un paquete `core` con lo técnico y transversal: configuración, conexión a la base, seguridad y el cliente de IA.
>
> Dentro de cada capa hay un archivo por módulo funcional. Por ejemplo, oportunidades tiene su router en presentación, su servicio en negocio y su repositorio en datos. En el código se ve exactamente esa estructura de carpetas.
>
> Dos cosas transversales importantes. Primero, cada fila guarda quién la creó y quién la modificó por última vez, y eso se completa solo. Segundo, la visibilidad por fila: un vendedor freelance solo ve sus propios clientes y oportunidades, y eso se aplica en las consultas, no en el front.

**Edición:** al mencionar oportunidades, mostrar uno al lado del otro `routers/oportunidades.py`, `servicios/oportunidades.py` y `repositorios/oportunidades.py`.

## Bloque 5 — Modelo de datos y estados (2 min)
**En pantalla:** [[DGM-ER]] (`03-Dominio/Diagramas/DER`), [[EST-Oportunidad]] y la lista de migraciones en `src/backend/alembic/versions/`.

**Narración:**
> Este es el modelo entidad-relación: 13 entidades, con `Cliente`, `Oportunidad`, `Cotización`, `Viaje` y `Pago` en el centro del circuito de venta. Un cliente puede tener muchas oportunidades; una oportunidad ganada se convierte en un viaje, y el viaje tiene su plan de pagos.
>
> Las entidades con ciclo de vida tienen un diagrama de estados. Por ejemplo, la oportunidad pasa por nueva, en gestión, cotizada y termina ganada o perdida. Esas transiciones las controla la capa de negocio, y la base suma restricciones: por ejemplo, una oportunidad perdida tiene que tener un motivo.
>
> El esquema se diseñó primero como script SQL y después la primera migración de Alembic lo reprodujo. Desde ahí, cada cambio es una migración nueva y versionada.

## Bloque 6 — Demo: crear algo y verlo en la base (4,5 min) ⭐
**En pantalla:** la web a la izquierda y DBeaver a la derecha (o alternando). Las DevTools del navegador, en la pestaña Red, para mostrar el pedido.

**Recorrido:**
1. Iniciar sesión en la web con la cuenta de demo.
2. **Crear un `Cliente`** desde la sección Clientes (nombre y contacto inventados).
3. En DevTools, mostrar el `POST` a `/api/clientes` y la respuesta `201` con el JSON.
4. En DBeaver:
   ```sql
   SELECT id, nombre, segmento, created_by, created_at
   FROM cliente
   ORDER BY created_at DESC
   LIMIT 1;
   ```
5. **Registrar una consulta** para ese cliente (destino, fechas tentativas y pasajeros). Es el `POST` a `/api/oportunidades`.
6. En DBeaver, mostrar la relación con el cliente y el usuario que la cargó:
   ```sql
   SELECT o.id, c.nombre AS cliente, u.nombre AS responsable,
          o.destino_consultado, o.pasajeros, o.estado, o.created_at
   FROM oportunidad o
   JOIN cliente c ON c.id = o.cliente_id
   JOIN usuario u ON u.id = o.responsable_id
   ORDER BY o.created_at DESC
   LIMIT 1;
   ```
7. **Cambiar el estado:** en el embudo, pasar la consulta a «En gestión». Volver a correr la consulta: `estado` pasa de `nueva` a `en_gestion` y cambian `updated_at` y `updated_by`.
8. *(Opcional)* Mostrar el mismo endpoint en Swagger (`/api/docs`) para que se vea el contrato.

**Narración:**
> Ahora vamos a seguir un dato de punta a punta. Creo un cliente nuevo en la web. En la pestaña de red se ve el pedido que salió: un `POST` a la API con los datos en JSON, y la respuesta con el cliente creado.
>
> Del lado del servidor, el router valida el formato, el servicio aplica las reglas y el repositorio lo guarda. Si vamos a la base, ahí está la fila nueva, con el usuario que la creó y la fecha, que se completaron solos.
>
> Ahora registro una consulta para ese cliente. En la base aparece en la tabla `oportunidad`, unida al cliente por su clave foránea y al usuario responsable, que es quien la cargó, en estado `nueva`.
>
> Por último, la paso a «En gestión» desde el embudo. Vuelvo a consultar: el estado cambió a `en_gestion` y quedó registrado quién hizo el cambio y cuándo. Es la misma transición que vimos en el diagrama de estados.

**Edición:** zoom a las columnas `estado`, `created_by` y `updated_at` cada vez que cambian. Si la consulta tarda, cortar la espera.

## Bloque 7 — Cierre (0,5 min)
**En pantalla:** escena «Cámara» y, de fondo, el C4 de contenedores (`ARQ-C4-2-contenedores.png`).

**Narración:**
> En resumen: dos clientes que comparten tipos generados desde el contrato, una API en tres capas que es dueña de las reglas, y una base relacional con migraciones versionadas, todo corriendo en un servidor dentro de la agencia. Gracias.

---

## Checklist de edición y entrega
- [ ] Revisar cada toma por secretos (contraseña de la base, `.env`, claves) y datos personales.
- [ ] Verificar que en la demo se lean los valores de las columnas (zoom al 150 % en DBeaver).
- [ ] Normalizar el volumen entre bloques.
- [ ] Exportar en 1080p (MP4) y mirarlo completo antes de mandarlo.
