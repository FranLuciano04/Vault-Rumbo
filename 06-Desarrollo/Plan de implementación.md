---
tipo: referencia
estado: en-revision
responsable: equipo
actualizado: 13/10/26
---
# Plan de implementación

tags:: #tipo/referencia #estado/en-revision #pc/pc2

> Cómo se cortó la [[Spec de implementación]] en tickets, en qué orden conviene trabajarlos y qué riesgos tiene el plan. Los tickets son los archivos de `06-Desarrollo/Tickets/`. El estado en vivo está en el [[Grafo de tickets]] y el [[Tablero de tickets]]. El proceso está en el [[Flujo de implementación]].

## 1. Números
**139 tickets** en 11 módulos: 80 S, 58 M y 1 XS; 29 de riesgo alto.

| Módulo | Tickets | IDs | Riesgo alto | Capas |
|---|---|---|---|---|
| M0 Fundaciones | 25 | T-001 → T-025 | 6 | 8 infra · 10 backend · 1 shared · 1 contrato · 2 web · 2 mobile · 1 e2e |
| M1 Usuarios y configuración | 13 | T-026 → T-038 | 3 | 1 contrato · 7 backend · 4 web · 1 e2e |
| M2 Clientes | 11 | T-039 → T-049 | 1 | 1 contrato · 4 backend · 3 web · 2 mobile · 1 e2e |
| M3 Alertas | 11 | T-050 → T-060 | 0 | 1 contrato · 4 backend · 2 web · 3 mobile · 1 e2e |
| M4 Oportunidades y cotizaciones | 14 | T-061 → T-074 | 3 | 1 contrato · 7 backend · 5 web · 1 e2e |
| M5 Hoteles y reseñas | 11 | T-075 → T-085 | 0 | 1 contrato · 4 backend · 5 web · 1 e2e |
| M6 Viajes y economía ⚠️ | 24 | T-086 → T-109 | 11 | 1 contrato · 13 backend · 8 web · 2 e2e |
| M7 Proceso diario y CRM proactivo | 9 | T-110 → T-118 | 4 | 5 backend · 1 infra · 1 web · 1 mobile · 1 e2e |
| M8 Calendario, dashboard y reportes | 10 | T-119 → T-128 | 0 | 1 contrato · 5 backend · 3 web · 1 e2e |
| M9 Redes e IA | 6 | T-129 → T-134 | 1 | 1 contrato · 2 backend · 2 web · 1 e2e |
| M10 Despliegue on-premise | 5 | T-135 → T-139 | 0 | 5 infra |

## 2. Cómo se cortó
- **Contrato primero.** Cada módulo con endpoints nuevos arranca con su ticket `contrato`, que deja los routers con stubs que responden `501`, los tipos y los mocks MSW. Con eso, backend, web y mobile avanzan en paralelo. M7 no tiene ticket de contrato porque CU-30 usa endpoints que ya existen. M10 es solo infraestructura.
- **Backend:** un ticket por CU o por flujo alternativo con lógica propia. Las máquinas de estados de `Viaje`, `Pago`, `Oportunidad` y `Cotización` tienen ticket propio y riesgo alto. Las de `Viaje` y `Pago` (T-087 y T-088) son lo único que cambia esos estados, así viajes y economía no dependen entre sí ([[ARQ — Vista general]], «Módulos»).
- **Web y mobile:** un ticket por pantalla o flujo del [[Prototipo UI]], que depende solo del contrato del módulo y del shell. La app mobile cubre lo que muestra el prototipo: login, agenda, alertas, recordatorios y clientes (RNF-14). La sugerencia de recontacto también, pero sin crear la consulta.
- **E2e:** un ticket por módulo con Playwright contra el Compose de e2e (Auth Emulator e IA falsa). Cada e2e suma la **semilla de demo** de su módulo a `datos-iniciales --demo`. M6 tiene dos: el circuito de CU-01 (T-108) y las excepciones del viaje (T-109). El mobile se prueba a mano en la barrera de M0, M2, M3 y M7.
- **Dependencias:** se declaran **por ticket**, aunque crucen módulos (por ejemplo, la confirmación de la reserva depende de los requisitos de destino de M1 y del servicio de alertas de M3). Así un módulo se puede empezar antes de que cierre el anterior.
- **Modelos:** se usan tres perfiles de la rúbrica de [[DEC-0014 Flujo de implementación con agentes|DEC-0014]].

  | Perfil | Tests | Implementación | Review | Se usa en |
  |---|---|---|---|---|
  | Estándar | sonnet | sonnet | opus | la mayoría |
  | Riesgo alto | sonnet | opus | sonnet | auth, permisos, dinero, estados y proceso diario |
  | Mecánico | sonnet | haiku | opus | Compose de desarrollo, análisis de seguridad del CI, los ABM de operadores (backend y web), que copian el patrón de destinos |

## 3. Prioridad para el PC2
La meta mínima es tener **M0 a M6 cerrados** (109 tickets), con el e2e de CU-01 pasando ([[Spec de implementación]] §1 y §9). Como el plazo es corto, el orden recomendado es:

1. **Camino de CU-01 (79 tickets):** T-108 y todo de lo que depende. Esto incluye casi todo M0, M2, M4 y M5, la mayor parte de M6, 5 tickets de M1 (parámetros, comisión por defecto, destinos, requisitos y el contrato) y el servicio de alertas de M3.
2. **El resto de M0 a M6 (30 tickets):** la app mobile (T-022, T-023, T-047, T-048, T-057 a T-059), la gestión de usuarios (T-027, T-028), los operadores y las pantallas de configuración (T-033 a T-037), la agenda (T-050, T-052 a T-056), las excepciones del viaje (T-093, T-095, T-098, T-099, T-107), los e2e de M1, M3 y M6 (T-038, T-060, T-109), la IA (T-013) y los análisis de seguridad (T-019).
3. **M7 a M10:** hasta donde lleguemos.

`tickets.mjs disponibles` ordena por módulo y por cuántos tickets destraba cada uno, lo que ya acerca bastante a este orden. Si dos opciones están parejas, conviene la que está en el camino de CU-01.

**Cadena más larga** (11 tickets, conviene que nunca esté parada):
T-001 → T-006 → T-007 → T-008 → T-010 → T-011 → T-030 → T-090 → T-092 → T-094 → T-108.

## 4. Arranque
Al principio hay cuatro tickets disponibles:

| Ticket | Qué es | Nota |
|---|---|---|
| T-001 | Backend con uv y FastAPI | Cabeza de la cadena crítica: destraba 133 tickets |
| T-002 | Workspace pnpm con la web | Destraba 122 |
| T-004 | PostgreSQL de desarrollo con Compose | Haiku; es corto |
| T-005 | Proyecto de Firebase | Necesita a una persona en la consola. Es de riesgo alto: el PR lo aprueba otro integrante |

Después de las fundaciones, el trabajo se abre en tres frentes que no se pisan: la cadena de **backend** (base, modelos, migración, seguridad, políticas), el **front compartido** (`@rumbo/shared`, shells web y mobile, login) y la **infraestructura** (CI, Compose de producción, e2e).

## 5. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| **Volumen contra plazo:** 109 tickets para M0–M6 en unas dos semanas y media | Primero el camino de CU-01 (§3). La fecha puede correrse una semana (spec §10) |
| **Tokens de Opus:** 29 tickets se implementan con Opus | El perfil de riesgo alto se usó solo donde la rúbrica lo exige; la review de esos tickets la hace Sonnet |
| `rumbo.sql` no se corrió contra PostgreSQL después de DEC-0016 | Lo verifica T-008 (la migración inicial), al principio de la cadena |
| Firebase necesita personas (consola, cuenta de servicio) | T-005 tiene un checklist; el backend no espera por él porque los tests usan un verificador falso |
| Firebase solo **genera** el link de contraseña desde el Admin SDK | T-027 verifica en la documentación oficial cómo hacer que Firebase envíe el mail desde el servidor, sin mails propios |
| Dependencias que no están en la spec §3: Google Sign-In nativo (T-023), calendario (T-125), gráficos (T-126) y herramienta de carga (T-139) | Los tickets lo marcan: se pregunta a la persona antes de agregarlas y, si se aprueban, se suman a §3 |
| RF-105 (editar reseña) no tenía endpoint en el contrato del PC1 | T-075 agrega `PATCH /resenas/{id}` y lo anota en la Bitácora técnica |
| WeasyPrint necesita GTK/Pango, que en Windows no viene instalado | T-024 lo deja en la imagen de la API; T-068 corre esos tests en el contenedor si hace falta |
| Los push de los claims a `main` no pueden quedar bloqueados por la protección de la rama | Al cerrar T-018 (CI), el dueño del repo exige checks solo en los PR |

## 6. Barreras
Cada módulo cierra con `/cerrar-modulo MN`: review de Codex, tickets de arreglo, e2e en verde, prueba manual del mobile si el módulo tiene pantallas mobile, aprobación del equipo y tag `mod-N` ([[Flujo de implementación]], fase 2). Mientras tanto se siguen tomando los tickets de otros módulos que tengan sus dependencias hechas.

## 7. Cómo se mantiene
- Un ticket nuevo (arreglo de review, hallazgo o algo que faltó) se crea desde [[PL-Ticket]] con el **siguiente número libre** y `origen` correspondiente. Después se corren `tickets.mjs validar` y `tickets.mjs grafo`.
- Si un ticket da L al empezarlo, se parte en dos y se actualizan las dependencias de los que lo esperaban.
- Este plan se actualiza solo si cambia el corte o la prioridad; el avance se ve en el grafo y el tablero.
