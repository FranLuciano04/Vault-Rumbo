---
id: T-076
titulo: Gestionar los hoteles del catálogo
modulo: M5 — Hoteles y reseñas
capa: backend
estado: hecho
depende_de: [T-075, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, RF-097, RF-098, RF-099, RF-100, RF-153]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 10:13
rama: feature/T-076-gestionar-los-hoteles-del-catalogo
pr:
---
# T-076 Gestionar los hoteles del catálogo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Todos menos el `freelance` dan de alta y editan hoteles del catálogo, con aviso de duplicados, y dan de baja un hotel que cerró.

## Criterios de aceptación
- [x] Alta y edición con datos mínimos validados (422) (A1, A3); `freelance` → 403.
- [x] Posible duplicado (nombre y destino) → aviso con confirmación (A2).
- [x] `POST /hoteles/{id}/baja` lo pasa a `cerrado` sin borrar sus reseñas (A4).

## Tests esperados
`tests/api/test_hoteles.py`: `test_rf097_alta_y_edicion`, `test_rf098_datos_minimos_422`, `test_rf099_posible_duplicado`, `test_rf100_baja_hotel_cerrado`, `test_freelance_403`.

## Contexto (leer solo esto)
- [[CU-16 Gestionar hotel en catálogo]]
- Contrato: `src/packages/shared/openapi.json` (módulo `hoteles`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Hotel]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/hoteles.py`
- `src/backend/rumbo/datos/repositorios/hoteles.py`
- `src/backend/rumbo/presentacion/routers/hoteles.py`

## Fuera de alcance
- Búsqueda y reseñas (tickets propios).

## Notas de implementación
- **De la review de T-075 (28/10/26):**
  - **Migración:** en la tabla `hotel`, `categoria`, `precio_referencia` y `servicios` son NOT NULL, pero CU-16 y RF-098 solo exigen nombre y destino. El contrato de T-075 los deja opcionales en `HotelCrear`, así que este ticket lleva una migración: `categoria` y `precio_referencia` pasan a admitir nulo, y `servicios` admite nulo o tiene una lista vacía por defecto.
  - **Duplicado:** manda CU-16 A2 (RF-099). Si el hotel ya existe en ese destino, se responde 409 con el hotel existente (`ProblemaDuplicado`) para ofrecer abrirlo, y vale también en el `PATCH`. **No hay** «aviso con confirmación» ni opción de guardar igual. Si este ticket decía otra cosa, prevalece el CU.
  - **Guardia de rol:** ya viene activa desde el contrato (`operacion(...)`). El freelance recibe 403 al escribir.
- **Implementación (28/10/26):**
  - Rutas `POST /hoteles`, `GET/PATCH /hoteles/{id}` y `POST /hoteles/{id}/baja`, armadas en capas: router → `servicios/hoteles.py` → `repositorios/hoteles.py`.
  - Migración 0006:
    - `categoria` y `precio_referencia` pasan a admitir nulo.
    - `servicios` pasa a `text[]` con default `{}`.
    - Se crea el índice único parcial `hotel_destino_nombre_normalizado_uq`, sobre (`destino_id`, nombre normalizado) y solo para `estado='activo'`.
    - El downgrade queda probado con datos.
- **Decisiones:**
  - **Duplicado:** se compara por destino y nombre normalizado, sin distinguir mayúsculas, tildes ni espacios de más, y solo contra los hoteles activos. El hotel que se edita no choca consigo mismo.
    - El índice cubre la carrera: si dos altas llegan a la vez, la que pierde recibe el mismo 409 con `existente`.
    - El flush va dentro de un savepoint que se abre antes de aplicar los cambios.
  - **Hoteles cerrados:** editarlos o darlos de baja otra vez responde 409.
  - **Destino inexistente:** responde 422 en `destino_id`, como en `oportunidades`.
  - **Edición con `null`:** en `categoria` y `precio_referencia` los vacía. Una `categoria` en `""` se guarda como `null`.
  - **Resumen de reseñas:** `puntaje_promedio` y `cantidad_resenas` se calculan sobre las reseñas publicadas, con una consulta por hotel. En T-077 quedó anotado que el listado no debe hacerlo por fila.
- **Corrección de dos decisiones del orquestador:** primero se había decidido que un `null` en categoría o precio diera 422 y que un destino inexistente diera 404. La review mostró que van contra las convenciones del proyecto, y se corrigieron en el fix.
- **Review (opus):** 0 bloqueantes, 3 importantes y 4 menores.
  - Importantes: faltaba el índice único, categoría y precio tenían que ser anulables, y el destino inexistente tenía que dar 422.
  - Menores: `servicios` pasó a `text[]` y se agregó el test del downgrade.
  - Quedan sin cambios: un hotel se puede asociar a un destino dado de baja (ningún CU lo prohíbe), y `05-Diseño/Datos/rumbo.sql` sigue desactualizado respecto de las migraciones 0002 a 0006, una deuda que viene de antes.
- **Archivo de soporte tocado con autorización en el fix:** en `tests/fabricas.py`, `HotelFactory.servicios` pasa a lista por el cambio de tipo.
- **Modelos:** sonnet en tests e implementación; opus en la review. No hubo refactor aparte.
