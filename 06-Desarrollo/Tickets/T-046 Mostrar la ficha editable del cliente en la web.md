---
id: T-046
titulo: Mostrar la ficha editable del cliente en la web
modulo: M2 — Clientes
capa: web
estado: hecho
depende_de: [T-044, T-149]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-006, RF-007]
origen: plan
asignado: FranLucianoo
tomado_el: 24/10/26 12:05
rama: feature/T-046-mostrar-la-ficha-editable-del-cliente-en
pr:
---
# T-046 Mostrar la ficha editable del cliente en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La ficha del cliente muestra sus datos y su historial, y permite editarla a quien corresponde.

## Criterios de aceptación
- [ ] Datos del cliente y su historial (oportunidades, viajes y reseñas) con enlaces a cada uno.
- [ ] Edición en línea con validación y errores 422 del servidor.
- [ ] Cliente no encontrado (404) con un estado claro.

## Tests esperados
`describe('RF-006 historial')`, `describe('RF-007 edición')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 10, 40 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-03 Gestionar ficha del cliente]]

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- Crear una consulta desde la ficha (M4).

## Notas de implementación
- **Sumado el 24/10/26 (Francisco, de T-042):** al `freelance` no se le muestra el selector de asesor: sus clientes siempre quedan a su nombre (RF-150). Si lo manda igual, el backend lo ignora.
- **Sumado el 22/10/26 (DEC-0017):** incluir el usuario de Instagram del cliente como campo **opcional**. No cuenta como contacto mínimo. El contrato lo expone desde T-149.
- **Implementado (24/10/26):** `FichaCliente` (en `/clientes/:id`), con `FormularioCliente`, `HistorialCliente` y `EditorEtiquetas`.
  - **Edición en línea:** «Editar ficha» abre el formulario en la misma página.
  - **PATCH:** manda solo los campos que cambiaron.
  - **Errores del servidor:** los 422 se muestran en su campo.
  - **Cliente inexistente:** un 404 muestra «Cliente no encontrado».
  - **Al guardar:** aparece el aviso «Ficha actualizada» y el foco vuelve a su lugar.
- **Decidido por Francisco (24/10/26), sumado en el fix:**
  - **Etiquetas editables en la ficha.** Ningún otro ticket web las asignaba.
  - **Reasignación por el empleado, como piden RF-007 y CU-03.** Se resolvió en este ticket, aunque toca backend y contrato:
    - `Cliente` expone `asesor: {id, nombre} | null`, cargado con `relationship(lazy="joined")`.
    - Nuevo `GET /usuarios/asesores`, para admin, dueño y empleado (el freelance recibe 403). Devuelve los usuarios activos de cualquier rol, solo con id y nombre.
  - **Cómo funciona el selector:**
    - Lo ven admin, dueño y empleado.
    - Un asesor de baja figura como «(de baja)».
    - «Sin asesor» manda `null`.
- **Otros cambios:**
  - `CampoFormulario` pasó a `src/components/`, y `errores` e `iniciales` a `src/lib/`.
  - La ruta `:seccion/*` hace que los enlaces del historial caigan en `SeccionPendiente`.
  - La reseña enlaza a `/hoteles/{hotel_id}?resena={id}`.
  - Nuevo hook `useAsesores` en shared.
- **Diferencias aceptadas con el prototipo:** el historial no tiene pestañas ni contadores, y no muestra los nombres del destino ni del hotel, porque la API solo devuelve sus ids.
- **Tests tocados con autorización (`--tocar-tests`):**
  - dos defectos del rojo: el `@` del email y el tipo de `camila`;
  - `getByText("Pareja")`, acotado con `within`;
  - cuatro `String(...)` por el lint;
  - `IMPLEMENTADAS`, `RUTAS` y `RF_POR_RUTA` de `test_contrato_m1.py`;
  - `RUTAS` de `m1.test.ts`.
- **Review (Opus):**
  - Primera ronda: 4 importantes y 6 menores, arreglados en el fix.
  - Segunda ronda, sobre el fix: 0 bloqueantes, 0 importantes y 2 menores, que quedan pendientes.
- **Menores pendientes:**
  - Con `lazy="joined"`, para bloquear un `Cliente` hay que usar `with_for_update(of=Cliente)` o `lazyload(Cliente.asesor)`: PostgreSQL rechaza `FOR UPDATE` sobre el lado nullable de un outer join.
  - `EditorEtiquetas` detecta los duplicados solo con `toLowerCase` (el backend también saca tildes y espacios), y controla el tope antes que el duplicado.
- **Checks:**
  - Backend: 923 tests pasan y 2 se saltean; cobertura 96,8 %; ruff, mypy y OpenAPI al día.
  - Web: 255 tests; cobertura de líneas 95 %; lint y tsc limpios.
  - Shared: 110 tests.
  - Mobile: typecheck, lint y 43 tests en verde.
- **Modelos:** tests Sonnet; implementación, contrato y fix Sonnet; refactor Sonnet (cortado, solo dejó el orden de un import); review Opus. Sin escalados.
