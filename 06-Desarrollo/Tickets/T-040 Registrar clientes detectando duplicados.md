---
id: T-040
titulo: Registrar clientes detectando duplicados
modulo: M2 — Clientes
capa: backend
estado: hecho
depende_de: [T-039, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, RF-001, RF-002, RF-003, RF-150]
origen: plan
asignado: palomap2003
tomado_el: 22/10/26 16:27
rama: feature/T-040-registrar-clientes-detectando-duplicados
pr:
---
# T-040 Registrar clientes detectando duplicados

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cualquier rol registra un cliente con sus datos mínimos; si parece repetido, el sistema lo avisa y pide confirmación; si lo crea un `freelance`, queda asignado a él.

## Criterios de aceptación
- [ ] Faltan datos mínimos (nombre, contacto, segmento) → 422 (A3).
- [ ] Posible duplicado por contacto o nombre → respuesta con los candidatos y sin alta, salvo confirmación explícita (A1).
- [ ] El cliente creado por un `freelance` queda con `asesor_asignado_id` = ese freelance (RF-150).

## Tests esperados
`tests/api/test_clientes.py`: `test_rf001_registrar_cliente`, `test_rf002_datos_minimos_422`, `test_rf003_posible_duplicado_pide_confirmacion`, `test_rf150_freelance_queda_asignado`.

## Contexto (leer solo esto)
- [[CU-02 Registrar cliente]] — flujo principal, A1 y A3
- [[Cliente]]
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/clientes.py`
- `src/backend/rumbo/datos/repositorios/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`

## Fuera de alcance
- Alta rápida desde una consulta (CU-04, M4).

## Notas de implementación
- **Duplicado (RF-003, CU-02 A1):** mismo contacto (sin distinguir mayúsculas) o mismo nombre sin distinguir mayúsculas ni tildes y con espacios colapsados (`translate` + `regexp_replace`, sin extensiones). El 409 trae hasta 10 candidatos (`ProblemaDuplicado`); `confirmar_duplicado: true` da el alta igual.
- **Visibilidad:** la búsqueda de parecidos respeta la visibilidad por fila: un `freelance` no ve duplicados de otros asesores (sin fuga, con test). Costo: puede duplicar un cliente ajeno sin enterarse → ✅ decidido el 24/10/26 por Francisco: se le avisa sin mostrar datos ajenos (CU-02 A1). Se implementa en T-042.
- **Asesor:** el `freelance` siempre queda como asesor aunque mande otro (RF-150). Para el resto, un `asesor_asignado_id` inexistente o inactivo da 422 (antes explotaba la FK con 500).
- **Errores:** `ErrorDeDominio` lleva un `extra` serializable que el manejador genérico vuelca en el problem+json; se sumó `DatosInvalidos` (422 sobre un campo). El módulo común de errores no conoce módulos.
- **Tests de soporte:** con autorización de Paloma, `tests/api/test_contrato_m2.py` suma `IMPLEMENTADAS = {("post", "/api/clientes")}` (commit verde, `--tocar-tests`). En el fix, autorizado por el orquestador, se completó `test_rf150_freelance_queda_asignado` y se sumaron tests de asesor inválido, no-fuga, tildes/espacios y tope.
- **Pendientes (menores, fuera del ticket):** normalizar el formato del teléfono, validar que el contacto sea un teléfono o email válido y la similitud difusa de nombres. Dependen de [[DEC-0017 Contacto mínimo del cliente]] (en revisión).
- **Modelos:** tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados.
