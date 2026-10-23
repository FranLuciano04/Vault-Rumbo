---
id: T-152
titulo: Rechazar en el rojo un comando de tests que no se pudo ejecutar
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0014]
origen: hallazgo T-034
asignado:
tomado_el:
rama:
pr:
---
# T-152 Rechazar en el rojo un comando de tests que no se pudo ejecutar

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`tickets.mjs fase T-NNN rojo --test "<cmd>"` deja de tomar como rojo válido un comando de tests que ni siquiera arrancó. En T-034, `pnpm` no estaba en el PATH del bash de la PC. El comando salió con `command not found` (código 127), el script lo dio por un rojo y commiteó sin que ningún test hubiera corrido. Al terminar este ticket, la persona ve un error claro y no se commitea nada.

## Criterios de aceptación
- [ ] En cualquier fase, si el comando de `--test` sale con 126 o 127 (bash), o con 9009 en el *fallback* a la shell de Windows, `fase` no commitea. Sale con un código propio, distinto de 2, 3 y 4, y con un mensaje que dice que el comando no se pudo ejecutar, no que los tests fallen.
- [ ] El rojo con una falla real de los tests (por ejemplo, vitest o pytest que salen con 1) se sigue aceptando como hoy, y el verde con 0 también.
- [ ] El mensaje sugiere revisar el PATH, por ejemplo `corepack pnpm` en lugar de `pnpm`. La §4 de la [[Spec de implementación]] o el [[Flujo de implementación]] documentan el código de salida nuevo.

## Tests esperados
Capa `infra`: no hay TDD. Se verifica ejecutando `fase` en una rama descartable:
- `--test "comando-que-no-existe"` en el rojo → error y ningún commit.
- `--test "exit 1"` en el rojo → acepta. `--test "true"` en el verde → acepta.

## Contexto (leer solo esto)
- `06-Desarrollo/herramientas/tickets.mjs`, función `correrTests`.
- [[Flujo de implementación]], la sección de `fase` y sus códigos de salida.

## Archivos probables
- `06-Desarrollo/herramientas/tickets.mjs`
- `06-Desarrollo/Flujo de implementación.md` o `06-Desarrollo/Spec de implementación.md` (solo el código de salida nuevo)

## Fuera de alcance
- Detectar otros falsos rojos, como un error de sintaxis o de import en el test: eso lo sigue verificando el orquestador leyendo la salida.
- Instalar o configurar `pnpm` en el PATH.

## Notas de implementación
