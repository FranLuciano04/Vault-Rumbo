---
tipo: analisis
estado: borrador
modulo: []
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
---
# Contrato de la API (OpenAPI)

tags:: #tipo/analisis #estado/borrador #pc/pc1

> Responde a la lámina del PC1 «Comunicación V-C: Open API (formato JSON)» (paso **F1** del plan). Es el contrato entre la **vista** (web y mobile) y el **controlador** (la API de FastAPI) de [[ARQ — Vista general]]. El archivo es [`openapi.json`](openapi.json), en esta carpeta.

## Qué es y qué no es
- Es un contrato **preliminar**, en **OpenAPI 3.1**, escrito para el PC1 a partir de los casos de uso ([[MOC — Casos de uso]]), el [[DGM-ER]] y los roles de [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]].
- Lista **todos los endpoints de los once módulos** (95 operaciones en 72 rutas), cada uno con su ruta, su método, el rol que exige, los casos de uso que realiza y sus códigos de error.
- Los **esquemas están completos solo para el circuito de [[CU-01 De la consulta a la venta|CU-01]]**: `Cliente`, `Oportunidad`, `Cotización`, `Viaje`, `Pago` y `Alerta`, más el inicio de sesión. El resto de los cuerpos usa el esquema `SinDetallar`.
- **En PC2 el contrato de referencia lo genera FastAPI** a partir de los esquemas Pydantic de `presentacion/esquemas/`, a medida que se escriben los endpoints. Este archivo queda como la foto del diseño del PC1, y el frontend toma sus tipos del contrato generado con `openapi-typescript` ([[DEC-0001 Stack tecnológico|DEC-0001]]).
- Se validó con **Redocly CLI** (reglas recomendadas): el documento es válido, con una sola advertencia porque no declara licencia (el repositorio es privado).

## Cómo se edita
El JSON **no se edita a mano**: lo produce [`generar-openapi.js`](generar-openapi.js), que tiene una fila por operación. Para cambiar el contrato se edita ese archivo y se vuelve a generar desde la raíz del repo:

```bash
node "05-Diseño/API/generar-openapi.js" "05-Diseño/API/openapi.json"
```

## Convenciones
- **Base:** todas las rutas cuelgan de `/api`, que `nginx` deriva al contenedor de la API ([[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]).
- **Recursos en español y en plural** (`/clientes`, `/viajes`), con los nombres del lenguaje ubicuo. Los campos van en `snake_case`, igual que en el [[DGM-ER]].
- **Cambios de estado como acciones.** Cada transición de los `EST-*` es un `POST` sobre el recurso con un verbo (`/oportunidades/{id}/perder`, `/viajes/{id}/cancelar`, `/pagos/{id}/cobrar`). Así cada operación corresponde a un paso de un caso de uso y la API puede rechazar las transiciones inválidas con un `409`.
- **Bajas lógicas** como acciones (`/baja`, `/anular`, `/ocultar`, `/descartar`). Hay solo dos `DELETE`: quitar un tramo del itinerario ([[CU-09 Armar itinerario de hoteles|CU-09]] A3) y la eliminación física excepcional de una reseña ([[CU-29 Eliminar reseña|CU-29]] A2).
- **Fechas** en ISO 8601 (`2026-10-02`); la interfaz las muestra como `dd/mm/aa`. **Importes** como texto decimal (`"1000000.00"`), que es como Pydantic serializa los `Decimal` y evita errores de redondeo.
- **Listados paginados** con `pagina` y `por_pagina` (máximo 100); devuelven `items`, `total`, `pagina` y `por_pagina`. El parámetro `mios` activa la vista personal de [[DEC-0005 Autenticación y modelo de roles|DEC-0005]].
- **Campos que calcula el servidor** (total de la cotización, ganancia, margen, saldo pendiente, porcentaje pagado, auditoría) van como `readOnly`.
- **Extensiones propias:** cada operación declara `x-roles` y `x-casos-de-uso`, además de describirlos en texto.

## Autenticación y roles
- `POST /auth/login` es la única operación pública: recibe email y contraseña y devuelve un **token Bearer** que firma `core.seguridad` ([[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]). El resto exige el token.
- **Roles por operación**, derivados de los actores de cada CU y de DEC-0005/0008:
  - **todos** (`admin`, `dueño`, `empleado`, `freelance`): la operación diaria (clientes, oportunidades, cotizaciones, viajes, pagos, alertas, calendario y dashboard propio) y la **lectura** de los catálogos.
  - **todos menos freelance:** el alta y la edición de hoteles, las reseñas y el módulo de redes. Redes exige además la **capacidad** `acceso_redes`, salvo para `admin` y `dueño`.
  - **admin y dueño:** usuarios, parámetros, comisiones por defecto, ABM de destinos, requisitos y operadores, moderación de reseñas y reportes.
- **Visibilidad por fila:** el `freelance` solo ve lo propio. Si pide un registro ajeno, la API responde **`404`** y no `403`, para no revelar que existe.
- **Escritura:** en oportunidades, viajes, pagos y alertas modifica el responsable del registro, o `admin` y `dueño` ([[DEC-0005 Autenticación y modelo de roles|DEC-0005]]); si no, **`403`**.

## Errores
Todos los errores usan `application/problem+json` (RFC 9457) con `title`, `status` y `detail`, y la lista `errores` por campo en las validaciones.

| Código | Cuándo |
|---|---|
| `401` | Falta el token o no es válido. En el login: credenciales incorrectas o usuario dado de baja. |
| `403` | El rol no alcanza, o el usuario no es el responsable del registro. |
| `404` | No existe, o el usuario no lo puede ver. |
| `409` | Choca con el estado actual: transición inválida, duplicado o regla del negocio (por ejemplo, dar de baja al último `admin`). |
| `422` | Datos inválidos, incluida la regla `Σ montos = precio de venta` del plan de pagos. |
| `502` | Solo en CU-20: la API de Claude no respondió; el resto del sistema sigue funcionando ([[DEC-0012 Modelo de IA del producto|DEC-0012]]). |

## Supuestos a revisar en la ratificación
- **Qué puede hacer el `freelance` fuera de lo operativo.** DEC-0008 dice que ve el catálogo compartido y opera solo lo suyo, pero no dice si registra reseñas o edita hoteles. El contrato asume que **no**.
- El **documento de la cotización** se descarga en **PDF** (`/cotizaciones/{id}/documento`). CU-06 dice que el sistema «genera el documento» sin fijar el formato.
- El **catálogo de reportes** de [[CU-22 Generar reportes y estadísticas|CU-22]] se expone como `/reportes` y `/reportes/{reporte_id}`, con salida en JSON, Excel o PDF; cada reporte se detalla en PC2.
- Los **recontactos** de [[CU-30 Sugerir recontacto de clientes|CU-30]] no tienen rutas propias: son alertas de tipo `recontacto` (`/alertas?tipo=recontacto`), el opt-out es `no_recontactar` en el cliente y el recontacto que prospera es una oportunidad nueva.

## Relación con otras notas
- Los datos que faltaban en el ER y que este contrato necesitaba (fecha de cobro, motivos, notas, estado previo, descripción de la alerta, entre otros) quedaron en [[DEC-0013 Datos que faltaban en el ER|DEC-0013]].
- La sección MVC del documento (G2) usa este contrato como ejemplo de la comunicación entre vista y controlador.

## Endpoints por módulo
Tabla generada desde `openapi.json`. «CU» son los casos de uso que realiza cada operación; [[CU-01 De la consulta a la venta|CU-01]] no aparece porque es el circuito que las encadena.

### seguridad

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `POST` | `/auth/login` | Iniciar sesión | público | CU-24 |
| `POST` | `/auth/logout` | Cerrar sesión | todos | CU-24 |
| `GET` | `/auth/yo` | Usuario de la sesión, con su rol y accesos | todos | CU-24 |
| `GET` | `/usuarios` | Listar usuarios | admin y dueño | CU-25 |
| `POST` | `/usuarios` | Dar de alta un usuario | admin y dueño | CU-25 |
| `GET` | `/usuarios/{usuario_id}` | Ver un usuario | admin y dueño | CU-25 |
| `PATCH` | `/usuarios/{usuario_id}` | Editar rol o accesos de un usuario | admin y dueño | CU-25 |
| `POST` | `/usuarios/{usuario_id}/baja` | Dar de baja un usuario (baja lógica) | admin y dueño | CU-25 |

### configuracion

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/configuracion` | Ver los parámetros del negocio | admin y dueño | CU-06, CU-07, CU-30 |
| `PUT` | `/configuracion` | Editar los parámetros del negocio | admin y dueño | CU-06, CU-07, CU-30 |
| `PUT` | `/usuarios/{usuario_id}/comision-por-defecto` | Configurar la comisión por defecto de un vendedor | admin y dueño | CU-13 |
| `GET` | `/destinos` | Listar destinos | todos | CU-26 |
| `POST` | `/destinos` | Dar de alta un destino | admin y dueño | CU-26 |
| `GET` | `/destinos/{destino_id}` | Ver un destino | todos | CU-26 |
| `PATCH` | `/destinos/{destino_id}` | Editar un destino | admin y dueño | CU-26 |
| `POST` | `/destinos/{destino_id}/baja` | Dar de baja un destino (baja lógica) | admin y dueño | CU-26 |
| `POST` | `/destinos/{destino_id}/reactivar` | Reactivar un destino | admin y dueño | CU-26 |
| `GET` | `/destinos/{destino_id}/requisitos` | Listar los requisitos de un destino | todos | CU-15 |
| `POST` | `/destinos/{destino_id}/requisitos` | Agregar un requisito a un destino | admin y dueño | CU-15 |
| `PATCH` | `/requisitos-destino/{requisito_id}` | Editar un requisito | admin y dueño | CU-15 |
| `POST` | `/requisitos-destino/{requisito_id}/baja` | Quitar un requisito (baja lógica) | admin y dueño | CU-15 |
| `GET` | `/operadores` | Listar operadores | todos | CU-31 |
| `POST` | `/operadores` | Dar de alta un operador | admin y dueño | CU-31 |
| `GET` | `/operadores/{operador_id}` | Ver un operador | todos | CU-31 |
| `PATCH` | `/operadores/{operador_id}` | Editar un operador | admin y dueño | CU-31 |
| `POST` | `/operadores/{operador_id}/baja` | Dar de baja un operador (baja lógica) | admin y dueño | CU-31 |
| `POST` | `/operadores/{operador_id}/reactivar` | Reactivar un operador | admin y dueño | CU-31 |

### clientes

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/clientes` | Buscar clientes | todos | CU-03 |
| `POST` | `/clientes` | Registrar un cliente | todos | CU-02 |
| `GET` | `/clientes/{cliente_id}` | Ver la ficha de un cliente | todos | CU-03 |
| `PATCH` | `/clientes/{cliente_id}` | Editar la ficha de un cliente | todos | CU-03, CU-30 |
| `GET` | `/clientes/{cliente_id}/historial` | Historial del cliente: oportunidades, viajes y reseñas | todos | CU-03 |

### oportunidades

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/oportunidades` | Listar oportunidades (embudo) | todos | CU-05 |
| `POST` | `/oportunidades` | Registrar una consulta | todos | CU-04, CU-30 |
| `GET` | `/oportunidades/{oportunidad_id}` | Ver una oportunidad | todos | CU-05 |
| `PATCH` | `/oportunidades/{oportunidad_id}` | Editar una oportunidad o sus notas de seguimiento | todos | CU-05 |
| `POST` | `/oportunidades/{oportunidad_id}/en-gestion` | Pasar la oportunidad a en gestión | todos | CU-05 |
| `POST` | `/oportunidades/{oportunidad_id}/insistencias` | Agendar una insistencia | todos | CU-05 |
| `POST` | `/oportunidades/{oportunidad_id}/perder` | Cerrar la oportunidad como perdida | todos | CU-05 |
| `POST` | `/oportunidades/{oportunidad_id}/reactivar` | Reactivar una oportunidad perdida | todos | CU-05 |
| `POST` | `/oportunidades/{oportunidad_id}/ganar` | Cerrar como ganada sin cotización formal (venta directa) | todos | CU-05 |
| `GET` | `/oportunidades/{oportunidad_id}/cotizaciones` | Listar las cotizaciones (versiones) de una oportunidad | todos | CU-06 |
| `POST` | `/oportunidades/{oportunidad_id}/cotizaciones` | Emitir una cotización o una nueva versión | todos | CU-06 |
| `GET` | `/cotizaciones/{cotizacion_id}` | Ver una cotización | todos | CU-06 |
| `GET` | `/cotizaciones/{cotizacion_id}/documento` | Descargar el documento de la cotización | todos | CU-06 |
| `POST` | `/cotizaciones/{cotizacion_id}/enviar` | Marcar la cotización como enviada | todos | CU-06 |
| `POST` | `/cotizaciones/{cotizacion_id}/aceptar` | Registrar que el cliente aceptó la cotización | todos | CU-06 |
| `POST` | `/cotizaciones/{cotizacion_id}/rechazar` | Registrar que el cliente rechazó la cotización | todos | CU-06 |

### viajes

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `POST` | `/oportunidades/{oportunidad_id}/confirmar-reserva` | Confirmar la reserva y crear el viaje | todos | CU-07, CU-10, CU-11 |
| `GET` | `/viajes` | Listar viajes | todos | CU-08 |
| `GET` | `/viajes/{viaje_id}` | Ver la ficha del viaje, con economía y saldo | todos | CU-08, CU-10, CU-12 |
| `POST` | `/viajes/{viaje_id}/iniciar` | Pasar el viaje a en curso | todos | CU-08 |
| `POST` | `/viajes/{viaje_id}/finalizar` | Pasar el viaje a finalizado | todos | CU-08 |
| `POST` | `/viajes/{viaje_id}/corregir-estado` | Volver al estado anterior por un error de carga | todos | CU-08 |
| `POST` | `/viajes/{viaje_id}/cancelar` | Cancelar el viaje | todos | CU-27 |
| `POST` | `/viajes/{viaje_id}/revertir-cancelacion` | Revertir la cancelación | todos | CU-27 |
| `GET` | `/viajes/{viaje_id}/itinerario` | Ver el itinerario de hoteles | todos | CU-09 |
| `POST` | `/viajes/{viaje_id}/itinerario` | Agregar un hotel al itinerario | todos | CU-09 |
| `PATCH` | `/tramos/{tramo_id}` | Editar un tramo o marcar pagado al proveedor | todos | CU-09 |
| `DELETE` | `/tramos/{tramo_id}` | Quitar un hotel del itinerario | todos | CU-09 |

### economia

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `PUT` | `/viajes/{viaje_id}/economia` | Registrar la economía del viaje | todos | CU-10 |
| `GET` | `/viajes/{viaje_id}/pagos` | Ver el plan de pagos y su checklist | todos | CU-11, CU-12 |
| `PUT` | `/viajes/{viaje_id}/pagos` | Definir o rebalancear el plan de pagos | todos | CU-11 |
| `PATCH` | `/pagos/{pago_id}` | Reprogramar el vencimiento de un pago | todos | CU-11 |
| `POST` | `/pagos/{pago_id}/anular` | Anular un pago (baja lógica) | todos | CU-11 |
| `POST` | `/pagos/{pago_id}/dividir` | Dividir un pago para cobrar una parte | todos | CU-11 |
| `POST` | `/pagos/{pago_id}/cobrar` | Registrar el cobro de un pago | todos | CU-12 |
| `POST` | `/pagos/{pago_id}/revertir-cobro` | Revertir un cobro cargado por error | todos | CU-12 |

### alertas

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/alertas` | Ver la agenda de alertas | todos | CU-14, CU-30 |
| `POST` | `/alertas` | Crear un recordatorio manual | todos | CU-28 |
| `GET` | `/alertas/{alerta_id}` | Ver una alerta | todos | CU-14 |
| `PATCH` | `/alertas/{alerta_id}` | Editar fecha o descripción de un recordatorio | todos | CU-28 |
| `POST` | `/alertas/{alerta_id}/vista` | Marcar una alerta como vista | todos | CU-14 |
| `POST` | `/alertas/{alerta_id}/resolver` | Resolver una alerta | todos | CU-14 |
| `POST` | `/alertas/{alerta_id}/posponer` | Posponer una alerta | todos | CU-14, CU-30 |

### hoteles

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/hoteles` | Buscar y recomendar hoteles | todos | CU-18 |
| `POST` | `/hoteles` | Dar de alta un hotel | todos menos freelance | CU-16 |
| `GET` | `/hoteles/{hotel_id}` | Ver un hotel | todos | CU-18 |
| `PATCH` | `/hoteles/{hotel_id}` | Editar un hotel | todos menos freelance | CU-16 |
| `POST` | `/hoteles/{hotel_id}/baja` | Dar de baja un hotel que cerró | todos menos freelance | CU-16 |
| `GET` | `/hoteles/{hotel_id}/resenas` | Ver las reseñas de un hotel | todos | CU-18 |
| `POST` | `/hoteles/{hotel_id}/resenas` | Registrar la reseña de un cliente | todos menos freelance | CU-17 |
| `POST` | `/resenas/{resena_id}/ocultar` | Eliminar una reseña (baja lógica) | admin y dueño | CU-29 |
| `POST` | `/resenas/{resena_id}/restaurar` | Restaurar una reseña oculta | admin y dueño | CU-29 |
| `DELETE` | `/resenas/{resena_id}` | Eliminar una reseña físicamente (excepcional) | admin y dueño | CU-29 |

### redes

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/contenidos` | Ver el tablero y el calendario de contenido | todos menos freelance (con acceso a redes) | CU-19 |
| `POST` | `/contenidos` | Crear una pieza de contenido | todos menos freelance (con acceso a redes) | CU-19, CU-20 |
| `GET` | `/contenidos/{contenido_id}` | Ver una pieza de contenido | todos menos freelance (con acceso a redes) | CU-19 |
| `PATCH` | `/contenidos/{contenido_id}` | Editar, reprogramar o mover una pieza en el tablero | todos menos freelance (con acceso a redes) | CU-19, CU-20 |
| `POST` | `/contenidos/{contenido_id}/descartar` | Descartar una pieza (baja lógica) | todos menos freelance (con acceso a redes) | CU-19 |
| `POST` | `/contenidos/propuestas-ia` | Generar borradores de contenido con IA | todos menos freelance (con acceso a redes) | CU-20 |

### dashboard

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/dashboard` | Ver indicadores y embudo de ventas | todos | CU-21 |
| `GET` | `/reportes` | Ver el catálogo de reportes | admin y dueño | CU-22 |
| `GET` | `/reportes/{reporte_id}` | Generar un reporte del período | admin y dueño | CU-22 |

### calendario

| Método | Ruta | Operación | Roles | CU |
|---|---|---|---|---|
| `GET` | `/calendario` | Ver viajes y vencimientos en el calendario | todos | CU-23 |
