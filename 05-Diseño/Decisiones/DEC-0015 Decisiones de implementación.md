---
tipo: decision
estado: formalizado
modulo: [seguridad, desarrollo]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 13/10/26
supersede:
actualizado: 13/10/26
---
# DEC-0015 Decisiones de implementación

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo completo el 13/10/26** (Francisco, Nahuel y Paloma, reunidos), en el grill de la fase 0 de [[DEC-0014 Flujo de implementación con agentes|DEC-0014]].

## Contexto
El diseño del PC1 fija el dominio, la arquitectura y el contrato, pero deja abiertas piezas técnicas que cada subagente tendría que inventar: cómo se mantiene la sesión, cómo se obtiene una contraseña sin servicio de mail, con qué se construye la UI, de dónde sale el contrato de cada módulo, dónde se prueba y se despliega y qué vara de calidad exige el CI. Se resolvieron en el grill antes de escribir la [[Spec de implementación]].

## Decisión
1. **Entorno con Docker.** Los tres integrantes usan Docker Desktop. Un Compose de desarrollo levanta PostgreSQL 18 para la app y otro, aparte, para los tests. Cada test corre en una transacción que se revierte. SQLite no sirve, porque el esquema usa enums nativos, CHECK y `gen_random_uuid()`.
2. **Sesión con JWT de 12 h.** `POST /auth/login` devuelve un JWT firmado (HS256, secreto en el `.env`) que dura una jornada. En cada pedido la API carga al usuario y **rechaza el token si el usuario ya no está activo**, así que una baja de [[CU-25 Gestionar usuarios y roles|CU-25]] corta el acceso al instante. El logout descarta el token en el cliente. La web lo guarda en memoria con respaldo en `sessionStorage`; el mobile, en SecureStore.
3. **Contraseñas temporales con cambio obligado.**
   - En el alta, o al restablecerla, el `admin` o la dueña asigna una **contraseña temporal** y se la entrega en persona.
   - El nuevo campo **`Usuario.debe_cambiar_password`** obliga a cambiarla en el próximo ingreso. Mientras sea `true`, la API solo acepta el cambio de contraseña y `/auth/yo`.
   - No hay recuperación por mail.
   - Mínimo de **10 caracteres**, hash **Argon2id** (RNF-03).
   - Endpoints nuevos: `POST /auth/cambiar-password` (el propio usuario) y `POST /usuarios/{id}/restablecer-password` (`admin` y dueña).
   - Ya está propagado a [[Usuario]], [[DGM-ER]] y `rumbo.sql`.
4. **Web:** Tailwind CSS con los tokens del [[Prototipo UI|prototipo de Figma]] como variables, componentes de **shadcn/ui** (copiados al repo, sobre Radix), React Router y react-hook-form + zod.
5. **Mobile:** **NativeWind** con los mismos tokens, **Expo Router** con las pestañas Agenda · Clientes · Más, y componentes propios.
6. **Un ticket de contrato por módulo.**
   - Cada módulo arranca con un ticket que escribe los esquemas Pydantic y los routers con *stubs* que responden `501`.
   - Ese ticket exporta el OpenAPI, regenera los tipos de `packages/shared` con openapi-typescript y escribe los mocks MSW.
   - Desde ahí, los tickets de backend, web y mobile del módulo avanzan en paralelo.
   - El preliminar del PC1, [[Contrato de la API (OpenAPI)]], sirve de guía; la fuente pasa a ser el contrato que genera FastAPI.
7. **Despliegue en dos etapas.** Hasta tener el servidor de la agencia, el Compose de producción (`nginx`, `api`, `postgres`, `scheduler`) se prueba en una PC del equipo para las demos. El último módulo monta el servidor real de [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]] con el túnel, el runner y el respaldo de RNF-08.
8. **CI en los runners de GitHub**, con cada job filtrado por carpeta (`src/backend/`, `src/apps/web/`, `src/apps/mobile/`, `src/packages/shared/`) y caché de uv y pnpm, para no pasar los 2.000 minutos mensuales del plan gratuito. Si nos acercamos al límite, se suma un runner self-hosted.
9. **Vara de calidad**, que el CI hace cumplir:
   - **Backend:** cobertura ≥ **80 %** en `rumbo/negocio/` y ≥ **70 %** en total.
   - **Front:** ≥ **70 %** en la lógica (hooks, esquemas y utilidades de `shared`, web y mobile).
   - **E2e web** con Playwright en los flujos clave de cada módulo.
   - **Mobile:** prueba manual guiada en la barrera del módulo; Maestro no corre en el CI.
10. **IA del producto:** una sola **clave del equipo** de la API de Claude, con límite de gasto. Va solo en el `.env` de las demos y del servidor, nunca en Git. Los tests usan un modelo falso. Sin clave, CU-20 responde el `502` previsto en el contrato.

### Supuestos técnicos aceptados en el mismo grill
- **Versiones:** Python 3.13 con uv; Node 22 LTS con pnpm; TypeScript estricto.
- **Identificadores** en español sin tildes, como en el ER y la ARQ; los términos técnicos, en inglés.
- **Base y backend:**
  - La primera migración de Alembic reproduce `rumbo.sql`.
  - PDF con WeasyPrint desde plantillas HTML y Excel con openpyxl.
  - Fechas guardadas en UTC; reglas y proceso diario en `America/Argentina/Buenos_Aires`.
- **Datos iniciales:** un comando crea la dueña inicial (con contraseña temporal) y datos de demo con factory-boy.

## Alternativas consideradas
| Tema | Alternativas descartadas | Por qué |
|---|---|---|
| Base de tests | SQLite; PostgreSQL nativo en cada PC | SQLite no soporta el esquema; las instalaciones nativas divergen entre PC |
| Sesión | Token opaco en una tabla; JWT corto + refresh; cookie httpOnly | Más tablas o más piezas sin beneficio para ~10 usuarios; la cookie obliga a dos mecanismos y a protección CSRF |
| Contraseñas | Temporal sin forzar el cambio; recuperación por mail | La temporal quedaría para siempre; no hay servicio de mail en el alcance |
| UI web | MUI; Mantine; CSS propio | Pelean contra el diseño propio del Figma, o son demasiado trabajo |
| UI mobile | React Native Paper; Tamagui | Otro estilo distinto del Figma, u obliga a rehacer la base de la web |
| Contrato | Completar el `openapi.json` a mano; backend primero | Dos fuentes que divergen, o sin paralelismo |
| Despliegue | Servidor desde el inicio; solo local | El servidor no está; el despliegue es parte del sistema |
| CI | Runner self-hosted en una PC del equipo; solo checks locales | Una PC apagada trabaría al equipo; sin garantía de que corran |
| Calidad | 90 % con Maestro en el CI; sin mínimo | Demasiados minutos de CI, o sin evidencia para el PC3 |
| Clave de IA | Una por persona; sin clave | Gasto disperso; o no se podría mostrar CU-20 |

## Impacto
- [[Usuario]], [[DGM-ER]] y `05-Diseño/Datos/rumbo.sql`: campo `debe_cambiar_password`.
- [[CU-24 Iniciar sesión|CU-24]] y [[CU-25 Gestionar usuarios y roles|CU-25]]: el cambio obligado y el restablecimiento por el `admin` se implementan como parte de esos CU (endpoints nuevos del punto 3).
- [[Spec de implementación]]: recoge estas decisiones como reglas para los tickets.
- Respeta el alcance: sin servicio de mail, sin OAuth, sin tiendas de apps.

## Decisores y fecha
- Grill: Nahuel, con Claude Code. Decisores: Francisco, Nahuel y Paloma. **Aprobada: 13/10/26.**

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
