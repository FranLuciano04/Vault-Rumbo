---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M5
actualizado: 29/10/26
---
# M5 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M5 — Hoteles y reseñas** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M5 — review Codex.md`. El tag de cierre es `mod-5`.

## Alcance
M5 arma el catálogo de `Hotel` y sus `Reseña`. En el backend incluye el ABM de hoteles (alta con solo nombre y destino, edición, baja lógica, duplicado por destino y nombre normalizado), la búsqueda ordenada por puntaje, el registro de reseñas de un `Cliente` (con `Viaje` opcional, [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]) y su moderación (ocultar con motivo, restaurar y eliminación física solo de una reseña ya oculta, CU-29 A2). Todo eso tiene contrato en `@rumbo/shared`, pantallas web (catálogo, alta y edición de hotel, detalle con reseñas, registrar reseña, moderación), la recomendación de hoteles al emitir una `Cotización` y un e2e.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M5 ya se corrigió más adelante, no lo reportes. Los hallazgos de M1 a M4 se arreglan aparte (`fix/M1-…` a `fix/M4-…`): no entran en esta review.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-075 Publicar el contrato de hoteles y reseñas]] | contrato | normal | CU-16, CU-17, CU-18, CU-29, RF-105, DEC-0003 | `a3bba04` Merge pull request #118 from FranLuciano04/feature/T-075-publicar-el-contrato-de-hoteles-y-resena |
| [[T-076 Gestionar los hoteles del catálogo]] | backend | normal | CU-16, RF-097 a RF-100, RF-153 | `d97a166` Merge pull request #119 from FranLuciano04/feature/T-076-gestionar-los-hoteles-del-catalogo |
| [[T-077 Buscar hoteles ordenados por su puntaje]] | backend | normal | CU-18, RF-106 a RF-110 | `1258b8b` Merge pull request #123 from FranLuciano04/feature/T-077-buscar-hoteles-ordenados-por-su-puntaje |
| [[T-078 Registrar las reseñas de un hotel]] | backend | normal | CU-17, RF-101 a RF-105, DEC-0003 | `cc38e8d` Merge pull request #120 from FranLuciano04/feature/T-078-registrar-las-resenas-de-un-hotel |
| [[T-079 Moderar las reseñas de los hoteles]] | backend | normal | CU-29, RF-111, RF-112, RF-153 | `431eac9` Merge pull request #122 from FranLuciano04/feature/T-079-moderar-las-resenas-de-los-hoteles |
| [[T-080 Buscar hoteles en el catálogo web]] | web | normal | CU-18, RF-106, RF-107, RF-109, RF-110 | `6f74c01` Merge pull request #125 from FranLuciano04/feature/T-080-buscar-hoteles-en-el-catalogo-web |
| [[T-081 Editar un hotel del catálogo en la web]] | web | normal | CU-16, RF-097 a RF-100 | `1c89417` Merge pull request #128 from FranLuciano04/feature/T-081-editar-un-hotel-del-catalogo-en-la-web (y `d3a93b4`, merge de `main` en la rama) |
| [[T-082 Mostrar el detalle del hotel con sus reseñas en la web]] | web | normal | CU-18, CU-29, RF-108, RF-111, RF-112 | `6df3c07` Merge pull request #127 from FranLuciano04/feature/T-082-mostrar-el-detalle-del-hotel-con-sus-res |
| [[T-083 Registrar una reseña en la web]] | web | normal | CU-17, RF-101 a RF-103, RF-105 | `cb2ed9f` Merge pull request #132 from FranLuciano04/feature/T-083-registrar-una-resena-en-la-web (y `6a2d74c`, merge de `main` en la rama) |
| [[T-084 Recomendar hoteles al emitir una cotización]] | web | normal | CU-06, CU-18, RF-106 | `e508a2a` Merge pull request #129 from FranLuciano04/feature/T-084-recomendar-hoteles-al-emitir-una-cotizac |
| [[T-085 Probar de punta a punta el catálogo de hoteles]] | e2e | normal | CU-16, CU-17, CU-18, CU-29 | `a16b3c3` Merge pull request #133 from FranLuciano04/feature/T-085-probar-de-punta-a-punta-el-catalogo-de-h |

Los 11 merges de PR suman 83 archivos distintos (+12.996 / −150 líneas, con las notas de tickets incluidas). Para T-081 y T-083 alcanza con el diff del merge del PR: los merges de `main` en la rama solo traen código de otros tickets. M5 agrega una migración: `0006_hotel_datos_opcionales` (T-076); las tablas `hotel` y `resena` vienen del esquema inicial (`0001`).

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 11 merges, sin las notas de tickets.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/negocio/errores.py`.
- Datos: `rumbo/datos/modelos/catalogos.py`, `rumbo/datos/repositorios/{hoteles,resenas,viajes}.py`, `rumbo/datos/semillas/{__init__,hoteles}.py`, `alembic/versions/0006_hotel_datos_opcionales.py`.
- Negocio: `rumbo/negocio/servicios/{hoteles,resenas}.py`.
- Presentación: `rumbo/presentacion/{contrato,openapi}.py`, `rumbo/presentacion/esquemas/{hoteles,comunes}.py`, `rumbo/presentacion/routers/hoteles.py`.
- Tests: `tests/api/test_{contrato_m5,hoteles,hoteles_busqueda,resenas,moderacion_resenas}.py`, `tests/negocio/test_{resenas,semilla_hoteles}.py`, `tests/test_migracion.py`, `tests/fabricas.py`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/modelos.ts`, `src/etiquetas.ts`, `src/cliente.ts`, `src/formato.ts` (test `formato.test.ts`).
- Hooks: `src/hooks/{index,hoteles}.ts`.
- Mocks: `src/mocks/{index,hoteles,m1}.ts`.

**Web (`src/apps/web/`)**
- Rutas: `src/app/{App,SeccionHoteles,SeccionNuevoHotel,SeccionEditarHotel,SeccionDetalleHotel}.tsx`.
- `src/features/hoteles/`: `PaginaHoteles.tsx`, `TarjetaHotel.tsx`, `SinResultadosHoteles.tsx`, `NuevoHotel.tsx`, `EditarHotel.tsx`, `FormularioHotel.tsx`, `BajaDelHotel.tsx`, `DetalleHotel.tsx`, `PaginadorResenas.tsx`, `ResenaPublicada.tsx`, `ResenasOcultas.tsx`, `FormularioResena.tsx`, `SelectorViaje.tsx`, `formato.ts` y sus tests (`PaginaHoteles`, `NuevoHotel`, `EditarHotel`, `DetalleHotel`, `RegistrarResena`).
- Cotizaciones (T-084): `src/features/oportunidades/cotizaciones/{BuscadorHoteles,CotizacionesOportunidad,FormularioCotizacion}.tsx`, `esquemas.ts` (test `RecomendarHoteles.test.tsx`).
- Fuera de hoteles (T-083): `AltaRapidaCliente.tsx` y `BuscadorCliente.tsx` se movieron de `features/oportunidades/` a `features/clientes/`; `features/oportunidades/NuevaConsulta.tsx` ajustó el import.
- e2e: `e2e/hoteles.spec.ts`.

**Mobile:** M5 no toca mobile.

**Notas de diseño:** T-079 agregó a [[CU-29 Eliminar reseña]] cuándo se permite la eliminación física (solo una reseña ya oculta; una publicada da 409), decidido por Francisco el 28/10/26. Queda abierto un `#accion/decidir` sobre una tabla de auditoría: no es hallazgo de la review.

## Puntos que conviene mirar entre tickets
1. **Permisos por rol (T-076, T-079, RF-153, DEC-0005).** Revisá en `routers/hoteles.py` y `servicios/{hoteles,resenas}.py` quién puede crear, editar y dar de baja un hotel, y quién puede ocultar, restaurar y eliminar una reseña (CU-29: `admin` y `dueño`). Que `GET /hoteles/{id}/resenas?estado=oculta` no le muestre las ocultas a quien no modera. Que la web (`BajaDelHotel`, `ResenasOcultas`, acciones de `ResenaPublicada`, botón de editar) oculte lo mismo que prohíbe el backend.
2. **Visibilidad de clientes y viajes en la reseña (T-078, T-083, DEC-0003).** `_exigir_cliente_y_viaje` valida el viaje con la visibilidad del actor y que sea del mismo cliente. Revisá que el cliente también se resuelva con la visibilidad del actor (un `freelance` no debería poder reseñar a nombre de un cliente que no ve), que el 422 no filtre si un cliente o viaje ajeno existe, y que `SelectorViaje` y `BuscadorCliente` pidan solo lo visible. `repositorios/viajes.py` es nuevo y mínimo: que no rompa lo que M6 (T-091) va a extender.
3. **Puntaje y orden de la búsqueda (T-077, T-080, RF-106 a RF-110).** Cómo se calcula el puntaje (promedio de reseñas **publicadas** solamente; las ocultas no ponderan, CU-29), el desempate y la posición de los hoteles sin reseñas, la paginación estable con ese orden, que los hoteles dados de baja no aparezcan y que los filtros (destino, categoría, precio, servicios) se combinen bien. Que `PaginaHoteles` y `formato.ts` muestren el puntaje y los nulos (`categoria`, `precio_referencia`) igual que el backend.
4. **Migración `0006` y duplicados (T-076, RF-099).** La conversión de `servicios` de texto a `text[]` con datos existentes (vacíos, espacios, comas sobrantes), el `downgrade`, y que el índice único parcial normalice igual que el chequeo de la aplicación (tildes, mayúsculas, espacios). Que el duplicado dé 409 tanto por el chequeo previo como por la violación del índice en una carrera, y que reactivar o editar un hotel no choque con uno dado de baja.
5. **Moderación de reseñas (T-079, CU-29).** Transiciones `publicada ↔ oculta`, 409 en las inválidas, `motivo_baja` obligatorio al ocultar y qué pasa con él al restaurar, que editar solo se permita sobre una publicada, y que la eliminación física solo proceda sobre una oculta y deje el registro en el log (quién, motivo, datos) sin escribir datos personales de más.
6. **Recomendación al cotizar (T-084, CU-06).** `BuscadorHoteles` dentro de `FormularioCotizacion`: que filtre por el destino de la oportunidad (que puede ser `null` desde DEC-0023), que elegir un hotel no cambie los importes ni el contrato de `Cotización` de M4, y que el formulario siga funcionando sin hoteles en el catálogo.
7. **Contrato backend ↔ shared ↔ web (T-075 y los tickets de front).** Que `openapi.json` y `tipos.gen.ts` coincidan con `esquemas/hoteles.py` después de T-076 a T-079 (campos opcionales, `servicios` como lista). Que `mocks/hoteles.ts` responda los mismos códigos y cuerpos que el backend real (404, 409 por duplicado o por transición inválida, 422 por campo), porque la web se desarrolló contra los mocks. Que `hooks/hoteles.ts` invalide catálogo, detalle y reseñas después de cada mutación. T-075 tocó `esquemas/comunes.py`, T-077 `presentacion/openapi.py` y T-081 `mocks/m1.ts`: que no cambien lo que ya existía.
8. **Cambios fuera del módulo.** T-083 movió `AltaRapidaCliente` y `BuscadorCliente` a `features/clientes/` y tocó `BuscadorCliente`: que la nueva consulta de M4 se comporte igual. T-076 tocó `negocio/errores.py`; T-080 `shared/src/formato.ts`, que usan otros módulos.
