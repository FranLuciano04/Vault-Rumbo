---
tipo: decision
estado: formalizado
modulo: [seguridad]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 23/10/26
supersede:
actualizado: 23/10/26
---
# DEC-0018 Revocación de sesiones de Firebase

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada el 23/10/26** por el equipo completo, reunido con Nahuel durante el triage de la review de Codex de M0 (hallazgo H-02). Complementa a [[DEC-0016 Autenticación con Firebase|DEC-0016]] y no reemplaza nada de ella.

## Contexto
[[DEC-0016 Autenticación con Firebase|DEC-0016]] fija que la API verifica el *ID token* de Firebase y que una baja de [[CU-25 Gestionar usuarios y roles|CU-25]] corta el acceso en el pedido siguiente, porque se consulta `Usuario.activo`. [[T-010 Verificar el token de Firebase para resolver el usuario actual|T-010]] implementó la verificación sin `check_revoked`, para no sumar una llamada a Firebase en cada pedido, pero sus notas prometían 401 para un token «revocado».

La review de Codex de M0 ([[M0 — review Codex]], H-02) lo marcó como bloqueante: si se revocan las sesiones de alguien o se deshabilita su cuenta **solo en Firebase**, el token que ya tiene sigue sirviendo hasta que vence, como máximo 1 h. Faltaba una decisión que dijera si eso es aceptable.

## Decisión
1. La API **no** comprueba en cada pedido si el token fue revocado: `verify_id_token` se llama sin `check_revoked`. Valida localmente la firma, el proyecto y el vencimiento.
2. La forma de cortar el acceso a una persona es la **baja en Rumbo** (`Usuario.activo = false`, [[CU-25 Gestionar usuarios y roles|CU-25]] A3), que corre en el pedido siguiente.
3. Se acepta que un corte hecho **solo en Firebase** (revocar las sesiones o deshabilitar la cuenta desde la consola) tarde **hasta 1 h** en aplicarse, lo que dura el *ID token*.
4. Ante un teléfono perdido o una cuenta comprometida, el procedimiento es dar de baja al usuario en Rumbo. Se reactiva cuando el problema esté resuelto.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Aceptar la ventana de 1 h y cortar el acceso con `Usuario.activo` | No suma latencia ni dependencia de Firebase en cada pedido. La baja que importa al negocio ya es inmediata | Un token robado sirve hasta 1 h si nadie da de baja al usuario en Rumbo | ✅ |
| `check_revoked=True` en cada pedido | Corte inmediato también desde Firebase | Una llamada a Google en cada pedido autenticado (cientos de ms). Si Firebase no responde, toda la API da 502 | ❌ |
| Comprobar la revocación con caché por usuario (cada N minutos) | Ventana de N minutos con pocas llamadas | Más código y estado en memoria para cubrir un caso que ya resuelve la baja en Rumbo | ❌ |

## Justificación
Rumbo es para una agencia PyME con pocos usuarios y un servidor propio ([[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]). La baja que le importa al negocio, sacar a alguien del sistema, ya es inmediata con `Usuario.activo`. Pagar latencia y una dependencia de Google en cada pedido para cubrir un caso que se resuelve dando de baja al usuario no se justifica.

## Impacto
- **Código:** el comportamiento no cambia. [[T-159 Alinear la verificación del token con la ventana de revocación aceptada|T-159]] alinea los comentarios de `core/seguridad.py` y fija con un test que no se pida `check_revoked`, para que nadie lo active sin una nueva `DEC-`.
- **Notas alineadas el 23/10/26:** [[T-010 Verificar el token de Firebase para resolver el usuario actual|T-010]] (aclaración sobre «revocado») y el triage de [[M0 — review Codex]].
- **Restricciones:** dentro del alcance; no cambia el stack.

## Decisores y fecha
- Decisores: Francisco, Nahuel y Paloma, reunidos el 23/10/26. Bajada técnica de Nahuel con Claude Code.
- Aprobada: 23/10/26.

## Vínculo con el código (a partir de PC2)
- `src/backend/rumbo/core/seguridad.py` — `VerificadorFirebase.verificar`.
- Pendiente: T-159.

## Estado / supersesión
No reemplaza ninguna decisión. Si en el futuro se exige el corte inmediato desde Firebase, una nueva `DEC-` la reemplaza y se evalúa la alternativa con caché.
