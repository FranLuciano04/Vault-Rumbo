---
tipo: decision
estado: formalizado
modulo: [clientes]
decisores: [Paloma, Francisco]
fecha_aprobacion: 22/10/26
supersede:
actualizado: 22/10/26
---
# DEC-0017 Contacto mínimo del cliente

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada el 22/10/26.** La propuso Paloma, responsable de [[CU-02 Registrar cliente]], el 21/10/26 durante T-039. Francisco la aprobó el 22/10/26 con un agregado: el usuario de Instagram se guarda como dato opcional.

## Contexto
La review de T-039, el contrato de clientes, detectó que el vault se contradecía sobre qué cuenta como contacto de un [[Cliente]]:

- **Instagram valía como contacto.** Así lo decían [[CU-02 Registrar cliente]] en el paso 2, [[CU-03 Gestionar ficha del cliente]] en el paso 3, el atributo `contacto` de [[Cliente]], RF-001 en [[Requisitos funcionales]] y [[DGM-ER]].
- **Solo valía teléfono/WhatsApp o email.** Así lo decían [[CU-02 Registrar cliente]] en el paso 3, A3 y la postcondición, y la decisión de Paloma del 10/09, ratificada el 29/09: «datos mínimos = nombre + al menos un contacto (teléfono/WhatsApp o email)».

## Decisión
1. El **contacto mínimo** de un `Cliente` es un **teléfono/WhatsApp o un email** (atributo `contacto`). Es obligatorio en el alta y en la edición de la ficha.
2. El cliente puede tener además un **usuario de Instagram** (atributo nuevo `instagram`, opcional). Es un dato extra de la ficha: **no cuenta como contacto mínimo**, así que un cliente no se puede registrar solo con su Instagram.

Instagram sigue siendo un **canal de entrada** de la consulta (`Oportunidad.canal`) y un canal de [[ContenidoRed]]. Esta decisión no cambia ninguno de los dos.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Teléfono/WhatsApp o email obligatorio, Instagram opcional | Mantiene la regla de datos mínimos ya ratificada. La agencia puede contactar siempre al cliente (alertas, cobros, recontacto) y conserva su Instagram para atenderlo por ahí | Suma un atributo al modelo | ✅ |
| Solo teléfono/WhatsApp o email | Coincide con la regla ya ratificada, sin cambiar el modelo | Se pierde el Instagram del cliente, aunque la agencia lo use para atenderlo | ❌ |
| Instagram también como contacto mínimo | Permite registrar a quien solo escribió por Instagram | El contacto por Instagram es manual y no se puede validar: la agencia no podría mandarle alertas ni recontacto. Contradice la regla ya ratificada | ❌ |
| Contacto libre (cualquier texto no vacío) | No restringe la carga | Deja pasar datos inservibles para contactar al cliente | ❌ |

## Justificación
La regla de datos mínimos de CU-02 (paso 3, A3 y postcondición) estaba ratificada desde el 29/09, y las menciones a Instagram como contacto eran restos de una redacción anterior. Al mismo tiempo, muchas consultas llegan por Instagram y la agencia lo usa para atender al cliente, así que conviene guardarlo sin exigirlo y sin que reemplace al teléfono o al email.

## Impacto
- **Notas alineadas el 22/10/26:**
  - [[CU-02 Registrar cliente]] (paso 2) y [[CU-03 Gestionar ficha del cliente]] (paso 3);
  - [[Cliente]] (atributos `contacto` e `instagram`);
  - RF-001 en [[Requisitos funcionales]];
  - [[DGM-ER]] y [[DGM — Diagrama de clases]].
- **Código:**
  - El esquema zod del alta en `@rumbo/shared` (T-039) ya valida teléfono (de 7 a 15 dígitos) o email.
  - El backend hoy solo controla el largo. Falta validar el formato con la misma regla en el ticket de backend de clientes.
  - El atributo `instagram` (columna, migración, contrato y esquemas) entra con T-149.
- **Restricciones:** dentro del alcance; no cambia el stack.

## Decisores y fecha
- Decisores: Paloma (responsable de CU-02, la propuso) y Francisco (la aprobó con el agregado del Instagram opcional).
- Aprobada: 22/10/26.

## Vínculo con el código (a partir de PC2)
- Rama: `feature/T-039-publicar-el-contrato-de-clientes` (PR #31, mergeado).
- Commits: `2e294dc` — esquema zod del alta, que acepta solo teléfono o email.
- Pendiente: T-149, atributo `instagram`.

## Estado / supersesión
No reemplaza ninguna decisión.
