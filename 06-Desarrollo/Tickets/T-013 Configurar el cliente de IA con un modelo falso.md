---
id: T-013
titulo: Configurar el cliente de IA con un modelo falso
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-006]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0012, RNF-16]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 21/10/26 20:17
rama: feature/T-013-configurar-el-cliente-de-ia-con-un-model
pr:
---
# T-013 Configurar el cliente de IA con un modelo falso

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`core.ia` ofrece una interfaz única para generar texto, con la implementación real (LangChain + `claude-sonnet-5-5`) y un modelo falso determinista que usan los tests, el CI y las demos sin clave.

## Criterios de aceptación
- [ ] La implementación se elige por configuración (`IA_MODELO=falso|claude`); la clave sale solo del entorno.
- [ ] Sin clave, pedir el modelo real falla con un error claro (`ServicioExterno`), nunca en silencio.
- [ ] Los tests nunca llaman a la API de Claude: un test falla si algo intenta construir el cliente real.

## Tests esperados
`tests/negocio/test_ia.py`: el falso devuelve una salida fija; la selección por configuración; el error sin clave.

## Contexto (leer solo esto)
- [[DEC-0012 Modelo de IA del producto|DEC-0012]]
- [[IA — Prompt de CU-20]] (solo para conocer la interfaz que va a necesitar)
- [[Spec de implementación]] §6 (IA) y §7

## Archivos probables
- `src/backend/rumbo/core/ia.py`
- `src/backend/tests/negocio/test_ia.py`

## Fuera de alcance
- El prompt de CU-20 y el endpoint de propuestas (M9).

## Notas de implementación
- Interfaz: `ModeloIA` (Protocol con `async generar(prompt) -> str`), `ModeloFalso`, `obtener_modelo_ia(settings)` y `_construir_cliente_claude(api_key)`, que es el único punto donde se construye el cliente real. Configuración: `IA_MODELO=falso|claude` (por defecto `falso`) y `ANTHROPIC_API_KEY` (`SecretStr`), documentadas en `src/backend/.env.example`.
- Modelo real: `claude-sonnet-5-5` (DEC-0012), con `timeout=60` s y `max_retries=1`. Los errores de la API se traducen a `ServicioExterno`.
- Con autorización de Nahuel (21/10/26): se tocó `tests/conftest.py` para agregar un fixture autouse que hace fallar cualquier construcción del cliente real, y se sumó la dependencia `langchain-anthropic` (`uv add --native-tls`, por un error de TLS en la PC).
- La review (opus) marcó 2 hallazgos importantes y 3 menores, todos arreglados en el fix con 2 tests nuevos. La guardia solo intercepta `_construir_cliente_claude`: tenerlo en cuenta en M9.
- Fuera del ticket: 5 tests que lanzan subprocesos (`test_cli_openapi`, `test_config`, `test_seguridad`) dan `PermissionError` en el setup en esta PC. También pasa sin los cambios del ticket.
- Modelos: tests sonnet, implementación y refactor sonnet, review opus. No hubo escalados.
