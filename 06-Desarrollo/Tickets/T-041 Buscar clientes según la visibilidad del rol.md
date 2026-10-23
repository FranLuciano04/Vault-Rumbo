---
id: T-041
titulo: Buscar clientes según la visibilidad del rol
modulo: M2 — Clientes
capa: backend
estado: tomado
depende_de: [T-039, T-012]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-03, RF-005, RF-009, RF-031, RF-151]
origen: plan
asignado: FranLucianoo
tomado_el: 23/10/26 11:47
rama: feature/T-041-buscar-clientes-segun-la-visibilidad-del
pr:
---
# T-041 Buscar clientes según la visibilidad del rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada rol busca clientes por texto o etiquetas y abre su ficha, viendo solo lo que le corresponde: el `freelance` únicamente sus clientes; el resto, toda la agencia con el filtro «lo mío».

## Criterios de aceptación
- [ ] `GET /clientes` con búsqueda por texto, etiquetas (segmentos comerciales; **varias combinables: el cliente tiene que tener todas**, decidido el 23/10/26) y «lo mío», paginado.
- [ ] `GET /clientes/{id}` devuelve la ficha; un cliente ajeno para el `freelance` → 404 (A1).
- [ ] La visibilidad sale de `politicas`, nunca del filtro que manda el front.

## Tests esperados
`tests/api/test_clientes.py`: `test_rf005_buscar_por_texto`, `test_rf031_filtrar_por_etiquetas`, `test_rf009_vista_personal`, `test_rf151_freelance_no_ve_ajeno_404`.

## Contexto (leer solo esto)
- [[CU-03 Gestionar ficha del cliente]] — pasos 1–2 y A1
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/clientes.py`
- `src/backend/rumbo/datos/repositorios/clientes.py`

## Fuera de alcance
- Historial (ticket propio).

## Notas de implementación
- **Para retomar (23/10/26, Francisco):** el rojo ya está commiteado (`cf0b236`) en `tests/api/test_buscar_clientes.py`: fallan 42 por 501 y pasan 5 de validación (422). Lo que sigue es el **verde con Opus**.
  - **Etiquetas:** parámetro multi `etiquetas` repetido (`?etiquetas=Brasil&etiquetas=Familias`); el cliente tiene que tener **todas**. Hoy el router solo tiene `etiqueta`: hay que agregar `etiquetas: list[str]` y quitar o mantener como alias el `etiqueta` viejo. Después, regenerar `openapi.json` y los tipos, porque el CI lo controla, y ajustar el mock y el hook `useClientes` de shared y su uso en `PaginaClientes` (T-044), que hoy manda `etiqueta`.
  - **Supuestos del rojo:**
    - orden por nombre ascendente;
    - búsqueda en nombre o contacto, sin tildes ni mayúsculas;
    - `mios=true`: `asesor_asignado_id` igual al actor;
    - el freelance solo ve los suyos en el listado aunque mande `mios`;
    - el detalle ajeno o sin asesor da 404 para el freelance, igual que uno inexistente;
    - admin, dueño y empleado ven el detalle de cualquier cliente;
    - una página fuera de rango da 200 con `items` vacío y el `total` real.
  - `test_contrato_m1.py` no tiene rutas de clientes. Hay que revisar si el contrato de T-039 tiene su propio test de 501 y aplicar la convención de `IMPLEMENTADAS`.
