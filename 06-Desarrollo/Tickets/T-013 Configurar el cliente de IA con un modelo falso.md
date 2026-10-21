---
id: T-013
titulo: Configurar el cliente de IA con un modelo falso
modulo: M0 — Fundaciones
capa: backend
estado: tomado
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
