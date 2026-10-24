---
id: T-045
titulo: Registrar un cliente en la web
modulo: M2 — Clientes
capa: web
estado: hecho
depende_de: [T-044, T-149]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, RF-001, RF-002, RF-003]
origen: plan
asignado: FranLucianoo
tomado_el: 24/10/26 15:03
rama: feature/T-045-registrar-un-cliente-en-la-web
pr:
---
# T-045 Registrar un cliente en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra un cliente desde la web; si el servidor avisa un posible duplicado, la persona ve los candidatos y decide.

## Criterios de aceptación
- [x] Formulario con validación zod de los datos mínimos (A3).
- [x] Aviso de posible duplicado con los candidatos y la opción de confirmar o ir al existente (A1).
- [x] Tras el alta se abre la ficha.

## Tests esperados
`describe('RF-002 datos mínimos')`, `describe('RF-003 posible duplicado')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 9 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-02 Registrar cliente]]

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- Alta rápida desde una consulta (M4).

## Notas de implementación
- **Sumado el 24/10/26 (Francisco, de T-042):** al `freelance` no se le muestra el selector de asesor: sus clientes siempre quedan a su nombre (RF-150). Si lo manda igual, el backend lo ignora.
- **Sumado el 24/10/26 (CU-02 A1):** cuando el 409 de un `freelance` indica que el duplicado es de otro asesor y no trae candidatos, mostrar «Ya hay un cliente con ese contacto en la agencia. Consultalo con un admin», con la opción de confirmar el alta. El formato del 409 lo define T-042.
- **Sumado el 22/10/26 (DEC-0017):** incluir el usuario de Instagram del cliente como campo **opcional**. No cuenta como contacto mínimo. El contrato lo expone desde T-149.
- **Implementación (24/10/26, Francisco):** `NuevoCliente` en `/clientes/nuevo` (ruta declarada antes de `clientes/:id`) y botón «Registrar cliente» en el listado. Reutiliza `esquemaFicha`, `SelectorAsesor` y `datosParaLaApi` de `FormularioCliente`.
  - **Desvíos del prototipo (pantalla 9):** página en vez de panel lateral; un único campo `contacto` (teléfono o email), como el contrato; segmento en `<select>`; sin etiquetas en el alta (CU-02 paso 2); el asesor arranca en «Sin asesor».
  - **Review (Opus):** 2 importantes y 1 menor, arreglados. «Confirmar alta» reenviaba los datos del primer envío y ahora toma y valida los actuales. Un 422 sobre `asesor_asignado_id` no se mostraba, y ahora sí; también en la ficha (CU-03). El aviso de duplicado pasó a un texto neutro (contacto o nombre).
  - **Modelos:** tests, verde, refactor y fix con Sonnet; review con Opus. Sin escalados.
