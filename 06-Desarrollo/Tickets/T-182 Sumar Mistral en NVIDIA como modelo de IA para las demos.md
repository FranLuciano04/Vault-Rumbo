---
id: T-182
titulo: Sumar Mistral en NVIDIA como modelo de IA para las demos
modulo: M12 — Mejoras para las demos
capa: backend
estado: tomado
depende_de: []
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0029, DEC-0012, CU-20, RNF-16]
origen: pedido de Francisco (15/11/26)
asignado: FranLucianoo
tomado_el: 15/11/26 16:59
rama: feature/T-182-sumar-mistral-en-nvidia-como-modelo-de-i
pr:
---
# T-182 Sumar Mistral en NVIDIA como modelo de IA para las demos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Con `IA_MODELO=nvidia` y una `NVIDIA_API_KEY`, `core.ia` genera texto con Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b`; al principio, Mistral Large 4, ver DEC-0029) en la API compatible con OpenAI de NVIDIA, para que las demos de CU-20 muestren borradores reales. `falso` sigue siendo el valor por defecto y `claude`, el de producción.

## Criterios de aceptación
- [ ] `obtener_modelo_ia` devuelve el cliente de NVIDIA con `IA_MODELO=nvidia`; sin `NVIDIA_API_KEY` falla con `ServicioExterno` y un mensaje claro.
- [ ] El cliente hace `POST {base}/chat/completions` con `model`, `messages` (el prompt como mensaje `user`) y la clave como `Authorization: Bearer`, y devuelve `choices[0].message.content`.
- [ ] Un error HTTP, de red o de timeout, o una respuesta sin texto, es `ServicioExterno(FALLA_IA)`, y el log no incluye ni el prompt ni la clave. Los tests nunca llaman a la red.

## Tests esperados
`tests/negocio/test_ia.py`: la selección por configuración (`nvidia`), el error sin clave, el cuerpo y los headers del pedido, el texto devuelto y los errores (HTTP 4xx/5xx, red, contenido vacío). Simular el transporte con `httpx.MockTransport`. La guardia autouse de `tests/conftest.py` también tiene que impedir construir el cliente real de NVIDIA.

## Contexto (leer solo esto)
- [[DEC-0029 NVIDIA como proveedor de IA para las demos|DEC-0029]]
- [[DEC-0012 Modelo de IA del producto|DEC-0012]]
- `src/backend/rumbo/core/ia.py` y `src/backend/rumbo/core/config.py`

## Archivos probables
- `src/backend/rumbo/core/ia.py`
- `src/backend/rumbo/core/config.py`
- `src/backend/tests/negocio/test_ia.py`
- `src/backend/tests/conftest.py`
- `src/backend/.env.example`

## Fuera de alcance
- Cambiar el prompt de CU-20 o el modelo de producción.
- Sumar paquetes nuevos: se usa `httpx`, que ya está instalado (dev y, en runtime, por `fastapi[standard]` y `langchain-anthropic`). Si se lo declara como dependencia directa en `pyproject.toml`, regenerar `uv.lock`.

## Notas de implementación
- URL base `https://integrate.api.nvidia.com/v1` y modelo `mistralai/mistral-large-4-1t-a52b`, verificados el 15/11/26 en `GET /v1/models`.
- Mistral Large 4 razona antes de responder, y `max_tokens` incluye ese razonamiento. Usar un tope mayor que el de Claude (por ejemplo, 4096) y tomar solo `message.content`, nunca `reasoning_content`. Timeout de 60 s, como el de Claude.
