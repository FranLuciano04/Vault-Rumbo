---
id: T-144
titulo: Exportar el OpenAPI con finales de línea LF
modulo: M0 — Fundaciones
capa: backend
estado: tomado
depende_de: [T-014]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0001]
origen: hallazgo T-016
asignado: Nahuel Viniegra
tomado_el: 20/10/26 20:13
rama: feature/T-144-exportar-el-openapi-con-finales-de-linea
pr:
---
# T-144 Exportar el OpenAPI con finales de línea LF

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`rumbo exportar-openapi` escribe `openapi.json` con finales de línea LF en cualquier sistema operativo. Así, regenerar el contrato en Windows no ensucia el diff de quien lo corra. Hoy `Path.write_text` traduce `\n` a CRLF en Windows, y en T-016 hubo que pasarlo a LF a mano.

## Criterios de aceptación
- [ ] El archivo exportado no contiene `\r\n` y termina en un único `\n`, también en Windows.
- [ ] El contenido JSON no cambia: mismo documento, misma indentación y `ensure_ascii=False`.

## Tests esperados
Un test de la CLI que llama a `exportar_openapi(tmp_path / "openapi.json")`, lee el archivo en bytes y afirma que no hay `b"\r\n"` y que termina en `b"}\n"`. En Windows tiene que fallar antes del arreglo.

## Contexto (leer solo esto)
- `src/backend/rumbo/presentacion/cli.py`, función `exportar_openapi`
- [[Spec de implementación]] §4 (comandos del backend)

## Archivos probables
- `src/backend/rumbo/presentacion/cli.py` (por ejemplo, `write_text(..., newline="\n")`)
- `src/backend/tests/test_cli.py` (o el archivo de tests de la CLI que ya exista)

## Fuera de alcance
- Normalizar los finales de línea del resto del repo (`.gitattributes`).
- Los tipos generados de `@rumbo/shared` (`tipos.gen.ts`), salvo que salgan con CRLF por el mismo motivo.

## Notas de implementación
