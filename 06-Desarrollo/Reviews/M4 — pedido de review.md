---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M4
actualizado: 28/10/26
---
# M4 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M4 — Oportunidades y cotizaciones** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M4 — review Codex.md`. El tag de cierre es `mod-4`.

## Alcance
M4 arma el embudo comercial. En el backend incluye el alta de una consulta como `Oportunidad` (con aviso de oportunidad abierta del mismo `Cliente`), el listado del embudo según el rol, la máquina de estados de la oportunidad (nueva → en gestión → cotizada → ganada/perdida, con reactivar), las insistencias de seguimiento que crean `Alerta` con el servicio de M3, la `Cotización` versionada con su vigencia, la respuesta del cliente (aceptar/rechazar) y el documento PDF con WeasyPrint. Todo eso tiene contrato en `@rumbo/shared`, pantallas web (nueva consulta, embudo, detalle con acciones e insistencias, emisión y respuesta de cotizaciones) y un e2e. Por [[DEC-0023 Datos mínimos de la consulta|DEC-0023]] (T-167, T-168), destino y pasajeros pasaron a ser opcionales, con la migración `0007`, y emitir una cotización sin ellos da 409.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M4 ya se corrigió más adelante, no lo reportes. Los hallazgos de M1 a M3 se arreglan aparte (`fix/M1-…` a `fix/M3-…`): no entran en esta review.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-061 Publicar el contrato de oportunidades y cotizaciones]] | contrato | normal | CU-04, CU-05, CU-06, DEC-0002 | `9437c34` Merge pull request #90 from FranLuciano04/feature/T-061-publicar-el-contrato-de-oportunidades-y |
| [[T-062 Registrar una consulta como oportunidad]] | backend | normal | CU-04, RF-004, RF-010 a RF-013, DEC-0002 | `a18398c` Merge pull request #114 from FranLuciano04/feature/T-062-registrar-una-consulta-como-oportunidad |
| [[T-063 Listar las oportunidades del embudo]] | backend | normal | CU-05, RF-016, RF-151 | `3c0c361` Merge pull request #92 from FranLuciano04/feature/T-063-listar-las-oportunidades-del-embudo |
| [[T-064 Implementar los estados de la oportunidad]] | backend | **alto** | CU-05, RF-016, RF-017, RF-020, DEC-0002 | `37b6cb2` Merge pull request #94 from FranLuciano04/feature/T-064-implementar-los-estados-de-la-oportunida |
| [[T-065 Agendar insistencias en el seguimiento de la oportunidad]] | backend | normal | CU-05, RF-014, RF-015, RF-018, RF-019 | `284f131` Merge pull request #115 from FranLuciano04/feature/T-065-agendar-insistencias-en-el-seguimiento-d (y `373190c`, merge de `main` en la rama) |
| [[T-066 Emitir cotizaciones versionadas con su vigencia]] | backend | **alto** | CU-06, RF-021, RF-022, RF-024 | `8c566b3` Merge pull request #111 from FranLuciano04/feature/T-066-emitir-cotizaciones-versionadas-con-su-v |
| [[T-067 Registrar la respuesta del cliente a la cotización]] | backend | **alto** | CU-06, RF-023, RF-025 | `89234e9` Merge pull request #116 from FranLuciano04/feature/T-067-registrar-la-respuesta-del-cliente-a-la (y `dbfdc38`, merge de `main` en la rama) |
| [[T-068 Generar el documento PDF de la cotización]] | backend | normal | CU-06, RF-021, RNF-16 | `e364ac7` Merge pull request #121 from FranLuciano04/feature/T-068-generar-el-documento-pdf-de-la-cotizacio |
| [[T-069 Registrar una consulta en la web]] | web | normal | CU-04, RF-004, RF-010 a RF-013 | `aab7a24` Merge pull request #112 from FranLuciano04/feature/T-069-registrar-una-consulta-en-la-web |
| [[T-070 Mostrar el embudo de oportunidades en la web]] | web | normal | CU-05, RF-016, RF-151 | `55b19a6` Merge pull request #109 from FranLuciano04/feature/T-070-mostrar-el-embudo-de-oportunidades-en-la |
| [[T-071 Seguir una oportunidad desde su detalle en la web]] | web | normal | CU-05, RF-014, RF-015, RF-017, RF-019, RF-020 | `ef53f9a` Merge pull request #110 from FranLuciano04/feature/T-071-seguir-una-oportunidad-desde-su-detalle |
| [[T-072 Emitir una cotización en la web]] | web | normal | CU-06, RF-021, RF-022, RF-024 | `9f4fe03` Merge pull request #113 from FranLuciano04/feature/T-072-emitir-una-cotizacion-en-la-web |
| [[T-073 Registrar la respuesta a una cotización en la web]] | web | normal | CU-06, RF-023, RF-025 | `bc9ba6b` Merge pull request #117 from FranLuciano04/feature/T-073-registrar-la-respuesta-a-una-cotizacion |
| [[T-074 Probar de punta a punta el embudo con cotización]] | e2e | normal | CU-04, CU-05, CU-06 | `a5507cc` Merge pull request #124 from FranLuciano04/feature/T-074-probar-de-punta-a-punta-el-embudo-con-co |
| [[T-167 Registrar una consulta sin destino ni pasajeros]] | backend | normal | CU-04, RF-013, DEC-0023 | `2c8dcc6` Merge pull request #126 from FranLuciano04/feature/T-167-registrar-una-consulta-sin-destino-ni-pa |
| [[T-168 Mostrar las consultas sin destino ni pasajeros en web y mobile]] | web | normal | CU-04, RF-013, DEC-0023 | `71c521b` Merge pull request #131 from FranLuciano04/feature/T-168-mostrar-las-consultas-sin-destino-ni-pas |

Los 16 merges de PR suman 112 archivos distintos (+15.978 / −841 líneas, con las notas de tickets incluidas). Para T-065 y T-067 alcanza con el diff del merge del PR: los merges de `main` en la rama solo traen código de otros tickets. M4 agrega una migración: `0007_oportunidad_destino_pasajeros_opcionales` (T-167); las tablas `oportunidad` y `cotizacion` vienen del esquema inicial (`0001`).

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 16 merges, sin las notas de tickets ni el grafo.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/core/fechas.py`.
- Datos: `rumbo/datos/modelos/comercial.py`, `rumbo/datos/repositorios/{oportunidades,alertas}.py`, `rumbo/datos/semillas/{__init__,oportunidades}.py`, `alembic/versions/0007_oportunidad_destino_pasajeros_opcionales.py`.
- Negocio: `rumbo/negocio/estados/{oportunidad,cotizacion}.py`, `rumbo/negocio/servicios/{oportunidades,alertas}.py`, `rumbo/negocio/documentos/{__init__,cotizacion}.py`, `rumbo/negocio/documentos/plantillas/cotizacion.html`.
- Presentación: `rumbo/presentacion/contrato.py`, `rumbo/presentacion/mapeos_alertas.py`, `rumbo/presentacion/esquemas/{oportunidades,alertas,clientes}.py`, `rumbo/presentacion/routers/{oportunidades,alertas,economia,viajes}.py`.
- Dependencias e infraestructura (T-068): `pyproject.toml` y `uv.lock` (`weasyprint`, `jinja2`), `Dockerfile` (Pango, HarfBuzz y fuentes), `.github/workflows/ci.yml` (librerías de sistema para WeasyPrint).
- Tests: `tests/api/test_{contrato_m4,oportunidades,oportunidades_estados,oportunidades_concurrencia,insistencias,cotizaciones,cotizaciones_respuesta,cotizacion_pdf,alertas}.py`, `tests/negocio/test_{estados_oportunidad,estados_cotizacion,semilla_oportunidades}.py`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/modelos.ts`, `src/etiquetas.ts`, `src/cliente.ts`, `src/alertas.ts`.
- Hooks: `src/hooks/{index,oportunidades,clientes,useConfiguracion}.ts` (test `oportunidades.test.ts`).
- Mocks: `src/mocks/{index,oportunidades,alertas}.ts`.

**Web (`src/apps/web/`)**
- Rutas: `src/app/{App,SeccionNuevaConsulta,SeccionOportunidades,SeccionDetalleOportunidad,SeccionCotizaciones}.tsx`.
- `src/features/oportunidades/`: `NuevaConsulta.tsx`, `BuscadorCliente.tsx`, `AltaRapidaCliente.tsx`, `AvisoOportunidadAbierta.tsx`, `PaginaOportunidades.tsx`, `TarjetaOportunidad.tsx`, `DetalleOportunidad.tsx`, `AccionesOportunidad.tsx`, `InsistenciasOportunidad.tsx`, `InteraccionesOportunidad.tsx`, `PasajerosOportunidad.tsx`, `EdicionDestinoPasajeros.tsx`, `esquemas.ts`, `permisos.ts` y sus tests (`NuevaConsulta`, `PaginaOportunidades`, `DetalleOportunidad`).
- `src/features/oportunidades/cotizaciones/`: `CotizacionesOportunidad.tsx`, `FormularioCotizacion.tsx`, `VersionesCotizacion.tsx`, `AccionesCotizacion.tsx`, `calculos.ts`, `esquemas.ts` y sus tests (`CotizacionesOportunidad`, `RespuestaCotizacion`).
- Fuera de oportunidades: `src/components/FiltroResponsable.tsx` (movido desde alertas), `src/components/ui/textarea.tsx`, `src/features/alertas/{AsociarCliente,PaginaAgenda}.tsx`, `src/features/clientes/{AvisoDuplicado,ResultadosClientes,HistorialCliente}.tsx` (test `FichaCliente.test.tsx`).
- e2e: `e2e/oportunidades.spec.ts`.

**Mobile (`src/apps/mobile/`)**
- Solo T-168: `src/features/clientes/HistorialClienteMobile.tsx` (test `__tests__/clientes.test.tsx`). M4 no tiene pantallas mobile propias.

**Notas de diseño:** [[DEC-0023 Datos mínimos de la consulta|DEC-0023]] (aprobada el 28/10/26) relajó destino y pasajeros. T-067 actualizó `03-Dominio/Diagramas/Estados/EST-Cotización.md`.

## Puntos que conviene mirar entre tickets
1. **Visibilidad y permisos (T-062 a T-068, DEC-0005).** `empleado` y `freelance` ven solo sus oportunidades; `admin`/`dueño`, todas. Revisá que el filtro se aplique en **cada** ruta de `routers/oportunidades.py`: listado, detalle, `PATCH`, cada transición, insistencias, cotizaciones (listar, emitir, ver, `documento`, enviar, aceptar, rechazar). Las rutas `/cotizaciones/{id}` llegan sin la oportunidad en la URL: que resuelvan la visibilidad a través de su oportunidad. Una ajena tiene que dar 404 a quien no la ve, y el filtro por responsable del embudo no tiene que dejar que un empleado vea el de otro pasando el parámetro a mano. Que `web/features/oportunidades/permisos.ts` oculte lo mismo que prohíbe el backend.
2. **Máquina de estados de la oportunidad (T-064, T-066, T-067, `negocio/estados/oportunidad.py`).** Transiciones válidas, 409 en las inválidas, `perder` con motivo (y detalle cuando el motivo lo pide), `reactivar` solo desde perdida y `ganar`. Revisá quién mueve a `cotizada` (emitir o enviar), qué pasa con la oportunidad cuando se acepta o se rechaza una cotización, y que una oportunidad cerrada no acepte insistencias, cotizaciones ni ediciones.
3. **Concurrencia y transacciones (T-064, T-066, T-067, `repositorios/oportunidades.py`).** Hay `with_for_update` sobre `Oportunidad` y sobre `Cotizacion`. Revisá que cada transición y cada emisión bloquee la fila antes de leer el estado, que dos emisiones simultáneas no den la misma versión, que aceptar dos versiones a la vez no deje dos aceptadas, y que el orden de bloqueo (oportunidad → cotización) sea el mismo en todas las rutas para no generar deadlocks. `test_oportunidades_concurrencia.py`: que pruebe la carrera de verdad y no en serie.
4. **Cotización versionada y vigencia (T-066, T-067, `estados/cotizacion.py`, `core/fechas.py`).** Versión correlativa por oportunidad, la nueva reemplaza a la anterior, vigencia en días de Argentina, no aceptar una vencida (`aceptar(..., hoy=...)`), importes en ARS sin errores de redondeo (Decimal, no float) y que `web/cotizaciones/calculos.ts` calcule los totales igual que el backend.
5. **DEC-0023 (T-167, T-168, migración `0007`).** `destino_consultado` y `pasajeros` opcionales al crear y al editar, validados si vienen. La migración: `CHECK (pasajeros IS NULL OR pasajeros >= 1)`, `downgrade` que no falle con filas nulas (o que lo diga). Emitir sin destino o sin pasajeros → 409 con qué falta, y que la web lo explique en vez de un error genérico. Todas las pantallas que los muestran (tarjeta, detalle, historial web y mobile, aviso de oportunidad abierta, PDF) toleran `null`.
6. **Insistencias y alertas (T-065, servicio de M3).** Las insistencias crean `Alerta` con `crear` del servicio de M3, y al cerrar la oportunidad se llama `resolver_de_origen`. Revisá: que perder y ganar resuelvan las alertas pendientes de la oportunidad pero no los recordatorios manuales asociados (RN-08), qué pasa con esas alertas al reactivar, que la alerta se asigne al responsable de la oportunidad y no a quien agenda (si son distintos) y que la fecha de una insistencia no pueda ser pasada. `mapeos_alertas.py` y `routers/alertas.py` cambiaron: que la agenda de M3 siga igual.
7. **Alta de consulta y aviso de oportunidad abierta (T-062, T-069).** Qué cuenta como «oportunidad abierta» del mismo cliente, si el aviso bloquea o solo informa, la alta rápida de cliente (`AltaRapidaCliente`) con el chequeo de duplicados de M2 (`AvisoDuplicado`, DEC-0020) y que el buscador de cliente respete la visibilidad del actor.
8. **Documento PDF (T-068, RNF-16).** Que `GET /cotizaciones/{id}/documento` aplique visibilidad, que la plantilla Jinja2 escape lo que escribe el usuario (nombre del cliente, notas) y que WeasyPrint no pueda leer archivos locales ni hacer pedidos de red desde el HTML (`url_fetcher`, `base_url`). El costo de generar el PDF dentro del request y los encabezados (`Content-Type`, `Content-Disposition` con el nombre del archivo).
9. **Contrato backend ↔ shared ↔ web (T-061 y los tickets de front).** Que `openapi.json` y `tipos.gen.ts` coincidan con `esquemas/oportunidades.py` después de T-167. Que `mocks/oportunidades.ts` responda los mismos códigos y cuerpos que el backend real (404 por ajena, 409 por transición inválida, por cotización vencida o por datos faltantes, 422), porque la web se desarrolló contra los mocks. Que `hooks/oportunidades.ts` invalide embudo, detalle, cotizaciones, historial del cliente y agenda después de cada mutación. T-061 tocó `routers/economia.py` y `routers/viajes.py`: confirmá que solo son stubs y no cambian lo que ya existía.
10. **Cambios fuera del módulo.** T-070 movió `FiltroResponsable` de alertas a `components/` y tocó `PaginaAgenda`; T-069 tocó `AsociarCliente`, `AvisoDuplicado` y `ResultadosClientes`; T-061 tocó `hooks/clientes.ts`. Que M2 y M3 se comporten igual. T-068 cambió el `Dockerfile` y el CI: que la imagen arranque y que el CI instale lo mismo que el `Dockerfile` (`libharfbuzz-subset0` está en uno solo).
11. **Semilla (T-074, `semillas/oportunidades.py`).** Idempotente, sin datos inventados del negocio y que no cree oportunidades sobre clientes de otro asesor.
12. **Tests.** Permisos por rol de cada ruta sin test, sobre todo `empleado` y `freelance` contra oportunidades y cotizaciones ajenas. Tests que pasarían con una implementación incorrecta (vigencia sin fijar la fecha, concurrencia en serie). Que el e2e de T-074 recorra el backend real y no los mocks.

## Especificación de referencia
- [[CU-04 Registrar consulta]], [[CU-05 Seguir oportunidad]], [[CU-06 Emitir cotización]]. Tocan de costado [[CU-14 Ver y atender alertas del día]] (insistencias) y [[CU-28 Crear recordatorio manual]].
- Requisitos: RF-004, RF-010 a RF-025, RF-151 en `02-Analisis/Requisitos funcionales.md`; RNF-16.
- Decisiones: DEC-0002, DEC-0005, DEC-0013, DEC-0019, DEC-0020, DEC-0023.
- Datos: `05-Diseño/Datos/rumbo.sql`. Contrato: `05-Diseño/API/openapi.json`. Estados: `03-Dominio/Diagramas/Estados/EST-Cotización.md`.
