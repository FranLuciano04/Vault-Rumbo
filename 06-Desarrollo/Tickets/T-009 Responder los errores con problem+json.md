---
id: T-009
titulo: Responder los errores con problem+json
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-001]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-06, RNF-12]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 14/10/26 18:00
rama: feature/T-009-responder-los-errores-con-problem-json
pr:
---
# T-009 Responder los errores con problem+json

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Toda respuesta de error de la API sale en formato problem+json con los códigos del contrato, y existe la utilidad común de paginación (`pagina`, `por_pagina`) que usan los listados.

## Criterios de aceptación
- [ ] Las excepciones de dominio (`NoEncontrado` 404, `SinPermiso` 403, `TransicionInvalida` 409, `Conflicto` 409, `ServicioExterno` 502) y la validación de Pydantic (422) se traducen a problem+json.
- [ ] Los listados reciben `pagina` y `por_pagina` validados y devuelven la forma de página que fija el contrato.
- [ ] Un error no controlado devuelve 500 problem+json sin filtrar detalles internos.

## Tests esperados
`tests/api/test_errores.py`: un router de prueba que lanza cada excepción y verifica estado, `content-type` y cuerpo; paginación con valores límite e inválidos.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — «Convenciones» y «Errores»
- [[Spec de implementación]] §7

## Archivos probables
- `src/backend/rumbo/negocio/errores.py`
- `src/backend/rumbo/presentacion/errores.py`
- `src/backend/rumbo/presentacion/paginacion.py`

## Fuera de alcance
- Los 401 de autenticación (los produce `core.seguridad` con estos mismos handlers).

## Notas de implementación
- `crear_app()` registra los manejadores (`registrar_manejadores`): `ErrorDeDominio` → estado según la jerarquía (`isinstance`, así las subclases heredan el código); una `ErrorDeDominio` sin estado y cualquier excepción no controlada → 500 genérico con log. `HTTPException` (ruta inexistente, futuros 401) y validación 422 también salen en problem+json.
- Decisiones sin fijar en el contrato: `por_pagina` por defecto 20 (máximo 100); títulos en español; sin campo `type` del RFC 9457; el 422 omite `input`, `ctx` y `url` para no reflejar lo que mandó el cliente.
- Review (opus): 1 importante (estado por tipo exacto → subclases daban 500) y 2 menores, arreglados con tests nuevos. Queda sin test la rama de `HTTPException` con `detail` no `str` (`presentacion/errores.py:71`).
- Modelos usados: tests sonnet, implementación y refactor sonnet (refactor sin cambios), review opus, fix haiku.
