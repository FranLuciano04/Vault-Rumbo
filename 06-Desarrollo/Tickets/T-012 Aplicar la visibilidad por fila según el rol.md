---
id: T-012
titulo: Aplicar la visibilidad por fila según el rol
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-007, T-009]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [RF-151, RF-150, RNF-02, DEC-0005, DEC-0008]
origen: plan
asignado: FranLucianoo
tomado_el: 18/10/26 20:00
rama: feature/T-012-aplicar-la-visibilidad-por-fila-segun-el
pr:
---
# T-012 Aplicar la visibilidad por fila según el rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`negocio/politicas.py` decide qué filas ve cada rol y qué puede escribir, y los repositorios **exigen** el filtro de visibilidad como parámetro obligatorio, así ningún módulo puede olvidarlo.

## Criterios de aceptación
- [ ] `visibilidad(actor)` devuelve un filtro: el `freelance` ve solo lo propio (clientes asignados y lo que cuelga de ellos); los demás roles ven toda la agencia.
- [ ] El repositorio base no tiene un valor por defecto para la visibilidad; una fila no visible responde 404 (no 403).
- [ ] `exigir_rol` y `exigir_escritura` lanzan `SinPermiso` (403) según la matriz de roles de DEC-0005/DEC-0008.

## Tests esperados
`tests/negocio/test_politicas.py`: `test_rf151_freelance_solo_ve_lo_propio`, `test_rf151_empleado_ve_toda_la_agencia`, `test_rf151_fila_ajena_da_404`, permisos por rol con fábricas.

## Contexto (leer solo esto)
- [[DEC-0005 Autenticación y modelo de roles|DEC-0005]]
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]
- [[ARQ — Vista general]] — `negocio/politicas.py` y «visibilidad por fila»
- [[Prototipo UI]] — «Vistas por rol»

## Archivos probables
- `src/backend/rumbo/negocio/politicas.py`
- `src/backend/rumbo/datos/repositorios/base.py`
- `src/backend/tests/negocio/test_politicas.py`

## Fuera de alcance
- Las reglas propias de cada módulo (las aplica cada servicio usando estas políticas).

## Notas de implementación
- **Contrato** (sigue la Spec §6):
  - `RepositorioBase[T]` no guarda estado: `obtener(sesion, id, *, visibilidad)` y `listar(sesion, *, visibilidad)`, con la visibilidad keyword-only, obligatoria y sin valor por defecto.
  - Hay un solo camino para «no existe» y «no es visible»: `NoEncontrado` (404).
  - `exigir_escritura(actor, registro)` decide según el tipo de entidad (tabla de DEC-0005 §2) y está **cerrada por defecto**: un tipo que no conoce lanza `SinPermiso`.
  - Pago, Cotización y ViajeHotel: el servicio pasa el `Viaje` o la `Oportunidad` padre.
- **Visibilidad:**
  - El `freelance` ve sus clientes (`asesor_asignado`).
  - También ve una Oportunidad o un Viaje si el cliente es suyo **o** si él es el responsable (interpretación literal de DEC-0008 §3). De ahí cuelgan las cotizaciones, los pagos y los hoteles del viaje que ve.
  - Ve el catálogo, y cualquier otro modelo le queda vacío (cerrado por defecto).
  - Empleado, admin y dueño leen toda la agencia, salvo las Alertas (propias, menos para admin y dueño) y las Reseñas `oculta`, que solo ven admin y dueño (CU-29, decidido por Francisco el 18/10).
  - Los servicios de Usuario, Configuración y Redes tienen que llamar a `exigir_rol` o chequear `acceso_redes`, porque la visibilidad por fila no los protege.
- **Errores:** la jerarquía se movió a `core/errores.py`, porque la capa datos no puede importar negocio. `negocio/errores.py` la reexporta, así que no cambió nada para quien ya la usaba.
- **Tests agregados en el fix, con autorización de Francisco:** lo que cuelga de lo propio (Cotización, Pago y ViajeHotel, incluido el OR) y las reseñas ocultas por rol.
- **Menores pendientes:**
  - `listar` no pagina: resolverlo con el primer módulo que lo use.
  - Confirmar con el equipo que el `freelance` conserva las operaciones de las que es responsable cuando se reasigna el cliente a otro asesor.
- **Entorno:** en esta PC, la base de desarrollo usa el puerto 5434 porque hay un PostgreSQL instalado en Windows.
- **Modelos:** tests con Sonnet; implementación, refactor y fix con Opus; review de seguridad con Sonnet. Sin escalados.
