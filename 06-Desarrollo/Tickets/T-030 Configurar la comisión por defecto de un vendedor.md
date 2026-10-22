---
id: T-030
titulo: Configurar la comisión por defecto de un vendedor
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: [T-026, T-012, T-011]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-13, RF-083, RF-084, RF-085, RN-01, DEC-0004, DEC-0007]
origen: plan
asignado: FranLucianoo
tomado_el: 22/10/26 15:06
rama: feature/T-030-configurar-la-comision-por-defecto-de-un
pr:
---
# T-030 Configurar la comisión por defecto de un vendedor

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña fijan la comisión por defecto de cada vendedor, como importe o como porcentaje sobre la ganancia, y el cambio solo afecta a los viajes nuevos.

## Criterios de aceptación
- [ ] `PUT /usuarios/{id}/comision-por-defecto` guarda tipo y valor como `Decimal`.
- [ ] Porcentaje fuera de 0–100, importe negativo o tipo sin valor → 422 (A1).
- [ ] Cambiar la comisión no modifica la comisión guardada en viajes existentes (RF-085).

## Tests esperados
`tests/api/test_comision.py`: `test_rf083_define_porcentaje`, `test_rf084_valor_invalido_422`, `test_rf085_no_cambia_viajes_existentes` (con una fábrica de viaje).

## Contexto (leer solo esto)
- [[CU-13 Configurar porcentaje de comisión]]
- [[RN-01 Comisión automática]]
- [[DEC-0004 Comisión configurable por porcentaje|DEC-0004]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Aplicar la comisión a un viaje (economía, M6).

## Notas de implementación
- **Implementación (22/10/26, Francisco):**
  - `negocio/servicios/configuracion.py` tiene `configurar_comision_por_defecto`:
    - exige el rol admin o dueño con `exigir_rol`, además de la guardia de la ruta;
    - busca con `visibilidad(actor)` y responde 404 si el usuario no existe;
    - guarda el tipo y el valor como `Decimal`, o los dos en `None` para quitar la comisión;
    - `updated_by` lo completa la auditoría de T-011;
    - no toca viajes (RF-085).
  - El router llama al servicio y devuelve `Usuario`. Ese esquema ahora tiene `from_attributes` y un validador que pasa los enums a texto. El OpenAPI no cambia.
  - La validación (porcentaje entre 0 y 100, tipo y valor juntos, 2 decimales) sigue en el esquema `ComisionPorDefecto` (T-026) y en el CHECK de la base. No se duplica en negocio.
- **Tests de otro ticket, con autorización de Francisco:** en `test_contrato_m1.py` (T-026), la ruta pasa a `IMPLEMENTADAS` y sale de `CASOS_501`. El test del cuerpo coherente ahora espera 404 en lugar de 501. Los tests de 401, 403 y contrato publicado no cambian.
- **Review de seguridad (Sonnet): aprobable.** 0 bloqueantes, 0 importantes y 2 menores:
  - Arreglado: el test del rol exigido por el servicio, en `tests/negocio/test_configuracion.py`. Se comprobó que falla si se quita `exigir_rol`.
  - Pendiente #accion/decidir: hoy se puede fijar la comisión de un usuario inactivo, la del propio admin y la de la dueña. Es coherente con DEC-0005 y no da permisos de más. Falta que el equipo decida si un usuario dado de baja puede tener comisión.
- **Hallazgo fuera de alcance:** el código (`politicas.py` y `dependencias.py`, desde T-012) usa RF-150 para el permiso por rol. En el catálogo, RF-150 es «asignar al freelance los clientes que crea» y el control por rol es RF-151. Conviene alinear las referencias en un ticket aparte.
- **Medición de cobertura:** coverage no cuenta las líneas que siguen a un `await` en los servicios. Probablemente se arregla con `concurrency = ["greenlet", "thread"]` en `[tool.coverage.run]`. No afecta el umbral.
- **Verificación:** 564 tests en verde; 97,4 % de cobertura total y 94 % en `negocio/`. Ruff y mypy pasan.
- **Modelos:** tests con Sonnet; verde, refactor y fix con Opus; review con Sonnet. No hubo escalados.
