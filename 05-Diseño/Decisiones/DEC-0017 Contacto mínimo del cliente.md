---
tipo: decision
estado: en-revision
modulo: [clientes]
decisores: [Paloma]
fecha_aprobacion:
supersede:
actualizado: 22/10/26
---
# DEC-0017 Contacto mínimo del cliente

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> ⏳ **Borrador para ratificar en la próxima sync.** Paloma, responsable de [[CU-02 Registrar cliente]], la tomó el 21/10/26 durante T-039.

## Contexto
La review de T-039, el contrato de clientes, detectó que el vault se contradice sobre qué cuenta como contacto de un [[Cliente]]:

- **Instagram vale como contacto.** Así lo dicen [[CU-02 Registrar cliente]] en el paso 2, [[CU-03 Gestionar ficha del cliente]] en el paso 3, el atributo `contacto` de [[Cliente]], RF-001 en [[Requisitos funcionales]] y [[DGM-ER]].
- **Solo vale teléfono/WhatsApp o email.** Así lo dicen [[CU-02 Registrar cliente]] en el paso 3, A3 y la postcondición, y la decisión de Paloma del 10/09, ratificada el 29/09: «datos mínimos = nombre + al menos un contacto (teléfono/WhatsApp o email)».

## Decisión
El contacto válido de un `Cliente` es un **teléfono/WhatsApp o un email**. Un usuario de Instagram (`@usuario`) **no** cuenta como contacto mínimo para el alta ni para la edición de la ficha.

Instagram sigue siendo un **canal de entrada** de la consulta (`Oportunidad.canal`) y un canal de [[ContenidoRed]]. Esta decisión no cambia ninguno de los dos.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Solo teléfono/WhatsApp o email | Coincide con la regla de datos mínimos ya ratificada. Son los canales por los que la agencia contacta al cliente (alertas, recontacto) y se pueden validar | El cliente que escribe por Instagram tiene que dar un teléfono o un email para quedar registrado | ✅ |
| También usuario de Instagram | Permite registrar a quien solo escribió por Instagram | El contacto por Instagram es manual y no se puede validar. Contradice la regla ya ratificada | ❌ |
| Contacto libre (cualquier texto no vacío) | No restringe la carga | Deja pasar datos inservibles para contactar al cliente | ❌ |

## Justificación
La regla de datos mínimos de CU-02 (paso 3, A3 y postcondición) ya estaba ratificada desde el 29/09. Las menciones a Instagram como contacto son restos de una redacción anterior, y la decisión resuelve la contradicción a favor de lo ratificado.

## Impacto
- **Al aprobarse,** hay que alinear estas notas: [[CU-02 Registrar cliente]] (paso 2), [[CU-03 Gestionar ficha del cliente]] (paso 3), [[Cliente]] (atributo `contacto`), RF-001 en [[Requisitos funcionales]] y [[DGM-ER]] (`contacto`).
- **Código:**
  - El esquema zod del alta en `@rumbo/shared` (T-039) ya valida teléfono (de 7 a 15 dígitos) o email.
  - El backend hoy solo controla el largo. Falta validar el formato con la misma regla en el ticket de backend de clientes.
- **Restricciones:** dentro del alcance; no cambia el stack.

## Decisores y fecha
- Decisores: Paloma (responsable de CU-02), a ratificar con Francisco y Nahuel.
- Aprobada: (pendiente)

## Vínculo con el código (a partir de PC2)
- Rama: `feature/T-039-publicar-el-contrato-de-clientes` (PR #31, mergeado).
- Commits: `2e294dc` — esquema zod del alta, que acepta solo teléfono o email.

## Estado / supersesión
No reemplaza ninguna decisión.
