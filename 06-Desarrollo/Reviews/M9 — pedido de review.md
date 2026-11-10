---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M9
actualizado: 10/11/26
---
# M9 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M9 — Redes e IA** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M9 — review Codex.md`.

## Alcance
M9 agrega la planificación de contenido para redes y la única función con IA del producto.

**Backend:**
- **Tablero de contenido** (CU-19):
  - Alta, edición, avance y retroceso por el kanban, reprogramación, calendario y descarte de las piezas de `ContenidoRed`.
  - El acceso es por rol y por `acceso_redes`; el freelance queda afuera siempre (DEC-0013).
  - El listado se ordena con `orden=asc|desc` y desempata por `id`.
- **Propuesta con IA** (CU-20) en `POST /contenidos/propuestas-ia`:
  - Hace una sola llamada a la IA y devuelve 2 borradores, cuyo título es el tema del pedido (DEC-0027). No persiste nada.
  - El prompt está versionado en `negocio/prompts/contenido_red.py` y no lleva datos de clientes (RNF-16, DEC-0012).
  - Si la IA falla o no devuelve 2 textos válidos, responde 502.
- `core/ia.py` suma `max_tokens` y convierte cualquier falla del cliente de IA en `ServicioExterno`.
- La semilla de demo suma 7 piezas ficticias.

**Contrato compartido:** esquemas, `openapi.json`, tipos generados, hooks y mocks de redes.

**Web:**
- La sección Redes, con tablero kanban, calendario, filtro por red y la vista de descartadas.
- El panel «Propuesta con IA», que se abre desde el encabezado o desde una pieza.
- Mobile no cambia.

**Pruebas e2e:** `redes.spec.ts` contra el sistema real con la IA falsa. También cambia el soporte compartido `e2e/compose.ts`.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-129 Publicar el contrato de redes]] | contrato | normal | CU-19, CU-20, DEC-0013 | `feac6fe` Merge pull request #196 |
| [[T-130 Planificar las piezas de contenido en el tablero]] | backend | normal | CU-19, RF-113 a RF-118, RF-153, DEC-0013 | `dd403a4` Merge pull request #197 |
| [[T-131 Generar borradores de contenido con IA]] | backend | ⚠️ alto | CU-20, RF-119, RF-120, RF-122, RNF-16, DEC-0012, DEC-0027 | `4f7ba36` Merge pull request #202 |
| [[T-132 Planificar contenido en el tablero web]] | web | normal | CU-19, RF-113 a RF-117 | `a89d9c4` Merge pull request #198 |
| [[T-133 Pedir una propuesta de contenido con IA en la web]] | web | normal | CU-20, RF-119, RF-121, RF-122 | `d3c19e5` Merge pull request #201 |
| [[T-134 Probar de punta a punta la planificación de redes]] | e2e | normal | CU-19, CU-20 | `7c5285f` Merge pull request #204 |
| [[T-169 Ordenar las piezas de contenido de la más nueva a la más vieja]] | backend | normal | CU-19, RF-114 | `ea5ab9e` Merge pull request #199 |
| [[T-170 Mostrar primero las publicadas recientes en el tablero web]] | web | normal | CU-19, RF-114 | `452b7f9` Merge pull request #200 |

T-131 tiene además `08b2d3d` (merge de `main` en su rama, para traer DEC-0027). No es un merge del módulo: el diff que hay que revisar es el de `4f7ba36`.

**Tamaño:** los 8 merges suman 55 archivos distintos, con unas +7.250 / −100 líneas. Esa cuenta incluye las notas de tickets y los archivos generados.

**Migraciones:** M9 no agrega ninguna. `ContenidoRed` ya existía.

**Riesgo:** solo T-131 es de riesgo alto, por la IA, los datos que salen al proveedor y el costo. Pasó dos rondas de `reviewer-seguridad` y lo aprobó otro integrante.

## Archivos tocados por el módulo
Es la unión de `git diff --name-only <merge>^1 <merge>` de los 8 merges, sin las notas de tickets ni de bitácoras.

**Backend (`src/backend/`)**
- Arranque: `rumbo/main.py`.
- Core: `rumbo/core/ia.py`.
- Datos:
  - `rumbo/datos/repositorios/{contenidos,seguridad}.py`;
  - `rumbo/datos/semillas/{__init__,redes}.py`.
- Negocio:
  - `rumbo/negocio/estados/contenido_red.py`;
  - `rumbo/negocio/prompts/{__init__,contenido_red}.py`;
  - `rumbo/negocio/servicios/redes.py`.
- Presentación:
  - `rumbo/presentacion/dependencias.py`;
  - `rumbo/presentacion/esquemas/redes.py`;
  - `rumbo/presentacion/routers/redes.py`.
- Tests:
  - `tests/api/test_{contenidos,contrato_m9,propuesta_ia}.py`;
  - `tests/negocio/test_{ia,redes,semilla_redes}.py`.

**Contrato compartido (`src/packages/shared/`)**
- Generados: `openapi.json`, `src/tipos.gen.ts`.
- `src/modelos.ts`.
- Esquemas: `src/esquemas/{index,redes}.ts`.
- Hooks: `src/hooks/{index,redes}.ts`.
- Mocks: `src/mocks/{index,redes,redes.test}.ts`.

**Web (`src/apps/web/`)**
- App: `src/app/{App,SeccionRedes}.tsx` y `App.redes.test.tsx`.
- Redes:
  - `src/features/redes/{PaginaRedes,PaginaRedes.test,TableroContenido,TarjetaContenido,CalendarioContenido,FormularioContenido}.tsx`;
  - `src/features/redes/{PropuestaIA,PropuestaIA.test,BorradoresPropuesta}.tsx`;
  - `src/features/redes/{useTableroContenido,etiquetas,sinAcceso}.ts`.
- e2e: `e2e/{compose.ts,redes.spec.ts}`.

**Vault:** `02-Analisis/Casos de uso/CU-20 Generar propuesta de contenido con IA.md` (A3 y A4, decididos por Paloma en T-133).

## Puntos que conviene mirar entre tickets
1. **Acceso a redes (T-129, T-130, T-131, T-132, T-133; DEC-0013).**
   - Que todas las rutas de `/contenidos`, incluida `propuestas-ia`, exijan la misma combinación de rol y `acceso_redes`, en el router y en el servicio.
   - Que el freelance quede afuera aun con `acceso_redes`.
   - Que un usuario dado de baja o al que se le quitó el acceso no pueda seguir operando.
   - Que la web oculte la sección a quien no tiene acceso, sin depender de eso para la seguridad.
2. **IA y datos que salen del sistema (T-131; RF-120, RNF-16, DEC-0012, DEC-0027).**
   - Que el prompt no pueda arrastrar datos de clientes ni de viajes.
   - Que el log no registre el prompt ni la salida de la IA.
   - El parseo de la lista de 2 textos: las tolerancias, los rechazos y el 502.
   - La neutralización de `<` y `>` en el pedido.
   - Que `ModeloFalso` sea el único modelo en tests, CI y e2e.
   - El costo: `max_tokens` es 1024 y el endpoint no tiene límite de pedidos (ver punto 7).
3. **Estados del kanban (T-129, T-130, T-132; EST-ContenidoRed).**
   - Que el `PATCH` solo permita las transiciones del diagrama, incluidas las de retroceso.
   - Que las piezas `publicado` y `descartado` queden en un estado coherente y que el descarte no se pueda revertir por otra vía.
   - Que la web ofrezca solo las acciones válidas para cada columna.
4. **Orden y paginación (T-130, T-169, T-170, T-132).**
   - Que `orden=asc|desc` desempate siempre por `id`, de modo que «Ver más» no repita ni saltee piezas.
   - Que la columna Publicado pida `desc` también en la página 2.
   - El calendario y sus bordes de fecha en `America/Argentina/Buenos_Aires`.
5. **Contrato backend ↔ shared ↔ web (T-129, T-131, T-133, T-169).**
   - Que `openapi.json`, `tipos.gen.ts` y los mocks coincidan con lo que devuelve el backend, en especial `PropuestaIA` con 2 borradores (DEC-0027) y el parámetro `orden`.
   - Que el panel de propuesta maneje el 502 y la regeneración sin perder lo que la persona ya editó.
   - Que se escape el texto de los borradores que muestra la web (sale de la IA).
6. **Soporte compartido de e2e (T-134, DEC-0019).**
   - `e2e/compose.ts`: el reintento del GET de `oobCodes`, que solo reintenta ante errores de red.
   - `URL_BASE` pasó a `127.0.0.1`: que no cambie el comportamiento de los demás specs. La suite completa dio 44 de 44.
7. **Ya conocido, no hace falta reportarlo:**
   - DEC-0027 está en revisión. La decidió Paloma y la ratificó Nahuel; falta la ratificación de Francisco.
   - [[IA — Prompt de CU-20]] sigue en `borrador`, y `contenido_red.py` copia literalmente su prompt de sistema.
   - No hay límite de pedidos por usuario en `POST /contenidos/propuestas-ia`. Es funcionalidad nueva y está a decidir si va como ticket (T-131).
   - La salida estructurada se pide por instrucción en el prompt y se parsea. No usa `with_structured_output` porque `ModeloIA.generar` es str → str (T-131).
   - Del tablero web (T-132):
     - un error del tablero sigue visible después de guardar desde el formulario, hasta la siguiente acción que sale bien;
     - no hay etiqueta «Borrador con IA» ni avatar del autor.
   - En el panel de propuesta (T-133), sin fondo bloqueante, el foco puede volver a la tarjeta anterior.
   - Los demás specs e2e leen `oobCodes` con un `fetch` directo, sin el reintento (T-134).
   - En Windows, los e2e necesitan detener el stack de demo `rumbo`, que ocupa el puerto 9099. Los PDF del backend fallan sin GTK. Las dos cosas son del entorno local, no del CI.
