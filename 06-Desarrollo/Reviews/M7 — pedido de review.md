---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M7
actualizado: 05/11/26
---
# M7 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M7 — Proceso diario y CRM proactivo** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M7 — review Codex.md`.

## Alcance
M7 agrega el proceso automático de cada noche y el recontacto de clientes.

**Backend:**
- `presentacion/jobs/diario.py` corre los pasos registrados. Cada paso es idempotente, usa la fecha de hoy en `America/Argentina/Buenos_Aires` y deja la auditoría sin autor.
- Vencimiento de pagos pendientes con fecha pasada y de cotizaciones enviadas sin respuesta y fuera de vigencia (RF-026).
- Sugerencia de avance de viajes por fecha de salida o regreso: una alerta `viaje`, y el cambio lo confirma una persona (RF-039).
- Detección de clientes fieles sin actividad hace `recontacto_meses` y alerta `recontacto` para su asesor, salvo opt-out (RF-027, RF-028, RF-030).
- Decisión sobre la sugerencia: convertirla en consulta, marcar `no_recontactar` o posponerla (RF-029).

**Infra:** el servicio `scheduler` del Compose corre el proceso a las 00:00 de Argentina y deja su log consultable.

**Web y mobile:** la sugerencia se atiende desde la agenda web y desde la app.

**Pruebas e2e:** `proceso-diario.spec.ts` contra el sistema real con `--fecha`.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-110 Armar el proceso diario idempotente]] | backend | ⚠️ alto | RNF-05, RNF-13 | `c3908c8` Merge pull request #175 |
| [[T-111 Vencer pagos y cotizaciones en el proceso diario]] | backend | ⚠️ alto | CU-06, CU-12, RF-026 | `295bafe` Merge pull request #184 |
| [[T-112 Sugerir el avance de los viajes en el proceso diario]] | backend | ⚠️ alto | CU-08, RF-039 | `115bceb` Merge pull request #185 |
| [[T-113 Detectar clientes inactivos para sugerir el recontacto]] | backend | ⚠️ alto | CU-30, RF-027, RF-028, RF-030 | `a7b2009` Merge pull request #181 |
| [[T-114 Registrar la decisión sobre una sugerencia de recontacto]] | backend | normal | CU-30, RF-029, RF-030 | `c835dda` Merge pull request #186 |
| [[T-115 Programar el proceso diario en el Compose]] | infra | normal | DEC-0011, RNF-13 | `a481b0a` Merge pull request #183 |
| [[T-116 Atender una sugerencia de recontacto en la web]] | web | normal | CU-30, RF-028, RF-029, RF-030 | `8c1c1f0` Merge pull request #177 |
| [[T-117 Atender una sugerencia de recontacto en la app mobile]] | mobile | normal | CU-30, RF-029, RF-030 | `d898b25` Merge pull request #178 |
| [[T-118 Probar de punta a punta el proceso diario]] | e2e | normal | CU-30, RF-026, RF-027, RF-039 | `76e5d54` Merge pull request #190 |

**Tamaño:** los 9 merges suman 47 archivos distintos (+4.010 / −281 líneas, con las notas de tickets incluidas).

**Migraciones:** M7 no agrega ninguna.

**Riesgo:** 4 de los 9 tickets son de riesgo alto.

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 9 merges, sin las notas de tickets ni de bitácoras.

**Backend (`src/backend/`)**
- Job: `rumbo/presentacion/jobs/{__init__,diario}.py`.
- Datos: `rumbo/datos/repositorios/{clientes,oportunidades,proceso_diario,seguridad,viajes}.py`.
- Negocio:
  - `rumbo/negocio/estados/cotizacion.py`;
  - `rumbo/negocio/servicios/{alertas,clientes,economia,oportunidades,proceso_diario,viajes}.py`.
- Tests:
  - `tests/api/test_{recontacto,viajes_estado}.py`;
  - `tests/negocio/test_{jobs,jobs_recontacto,jobs_vencimientos,jobs_viajes}.py`.

**Infra:** `src/docker-compose.yml`, `src/infra/crontab`, `src/backend/Dockerfile`.

**Contrato compartido:** `src/packages/shared/src/hooks/clientes.ts`.

**Web (`src/apps/web/`)**
- `src/features/alertas/{PaginaAgenda,PanelDetalleAlerta,TarjetaRecontacto}.tsx` y `PaginaAgenda.recontacto.test.tsx`.
- `src/features/oportunidades/NuevaConsulta.tsx` y `NuevaConsulta.recontacto.test.tsx`.
- e2e: `e2e/{apoyo.ts,proceso-diario.spec.ts,viajes-excepciones.spec.ts}`.

**Mobile (`src/apps/mobile/`)**
- `src/features/alertas/{DetalleAlertaMobile,RecontactoMobile}.tsx`.
- `src/features/clientes/{AccionesContacto,FichaClienteMobile}.tsx`.
- `__tests__/recontacto.test.tsx`.

## Puntos que conviene mirar entre tickets
1. **Idempotencia y fallas parciales (T-110 a T-113, RNF-05).**
   - Que correr el proceso dos veces el mismo día no duplique alertas ni cambie estados.
   - Que un paso que falla no deje datos a medias ni frene a los demás, y que el código de salida lo refleje.
   - Qué pasa si dos corridas se pisan, por ejemplo el `scheduler` y una corrida manual.
2. **Fechas y zona horaria (T-110, T-111, T-115).**
   - Que «hoy» sea siempre el de `America/Argentina/Buenos_Aires`, también en el contenedor y en el crontab.
   - Los bordes: un pago que vence hoy y una cotización en su último día de vigencia.
   - Que `--fecha` no deje estado global.
3. **Estados y dinero (T-111, T-112).**
   - Que el vencimiento pase por `negocio/estados/` y no escriba el estado por fuera.
   - Que un pago `vencido` se pueda cobrar y revertir igual que antes, y que `saldo_pendiente` y RN-02 no cambien.
   - Que el proceso solo sugiera el avance del viaje y nunca lo cambie.
   - Los cambios en `servicios/{economia,viajes}.py` y `repositorios/viajes.py`, de M6: que no alteren lo ya cumplido.
4. **Recontacto (T-113, T-114, RF-027 a RF-030).**
   - Quién cuenta como cliente fiel, qué es «actividad» y qué pasa con el umbral `recontacto_meses`.
   - Quién recibe la alerta si el cliente no tiene asesor o el asesor está de baja.
   - Que `no_recontactar` excluya al cliente en corridas futuras, y cuándo vuelve a sugerirse uno pospuesto.
   - Que crear la consulta resuelva la sugerencia en la misma transacción.
5. **Auditoría y permisos (T-110, T-114, DEC-0005).**
   - `repositorios/seguridad.py` cambió: que la auditoría sin autor sea solo para el proceso y no abra un camino desde la API.
   - Que un `freelance` solo vea y atienda sugerencias de sus clientes, y que el 404 no filtre su existencia.
6. **Infra (T-115, DEC-0011).**
   - Que el `scheduler` no quede sin correr en silencio y que el log sea consultable.
   - Que el `Dockerfile` y el crontab no agreguen privilegios ni secretos.
7. **Contrato backend ↔ shared ↔ web ↔ mobile (T-114, T-116, T-117).**
   - Que web y mobile ofrezcan las decisiones que corresponden y oculten lo mismo que prohíbe el backend.
   - Que `hooks/clientes.ts` invalide agenda y alertas después de decidir.
   - Que `NuevaConsulta.tsx`, de M4, siga igual fuera del recontacto.
8. **Ya conocido, no hace falta reportarlo:**
   - El e2e arma sus propios datos en vez de usar los de demo, porque no hay semilla de recontacto.
   - Las demás copias de `tokenDe` en `e2e/` no se migraron a `apoyo.ts`.
