---
id: T-182
titulo: Sumar Mistral en NVIDIA como modelo de IA para las demos
modulo: M12 — Mejoras para las demos
capa: backend
estado: hecho
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
- **Modelo:** URL base `https://integrate.api.nvidia.com/v1`, verificada el 15/11/26 en `GET /v1/models`.
  - Se empezó con Mistral Large 4 (`mistralai/mistral-large-4-1t-a52b`). En la prueba real tardó de 8 a más de 180 s y dio `ReadTimeout`.
  - A pedido de Francisco se midieron otros modelos del catálogo con la misma clave (tabla en DEC-0029). Se cambió a **Nemotron 3 Ultra** (`nvidia/nemotron-3-ultra-550b-a55b`) con `chat_template_kwargs: {"enable_thinking": false}`: tarda de 4 a 10 s y escribe mejor texto en rioplatense.
  - Con el razonamiento prendido, estos modelos gastan los tokens pensando y `content` llega vacío.
  - El título del ticket conserva el nombre del primer modelo.
- **Cliente:** usa `httpx`, sin dependencias nuevas.
  - Abre un `AsyncClient` por llamada, que se cierra al salir.
  - Tiene un timeout propio de 180 s, por la latencia variable del plan gratuito. Se sumó `proxy_read_timeout 200s` en `location /api/` de `src/infra/nginx.conf`.
  - El log de una falla lleva solo el tipo de error, sin prompt, clave ni `str(error)`.
- **Prueba real (15/11/26):** `POST /api/contenidos/propuestas-ia` a través de Vite dio 200 en 6 y 11 s, con dos borradores en rioplatense.
- **Review (opus):** 1 importante y 3 menores.
  - Importante, arreglado: el `AsyncClient` no se cerraba.
  - Menores que quedan:
    - `httpx` sigue declarado solo en el grupo dev. En runtime llega por `fastapi[standard]`, `langchain-core` y `firebase-admin`. No se pudo regenerar `uv.lock` porque el DNS de esta PC bloquea files.pythonhosted.org.
    - NVIDIA no tiene reintento. Es a propósito.
    - La descripción del OpenAPI de `POST /contenidos/propuestas-ia` sigue diciendo «Claude Sonnet 5.5». Corregirla obliga a regenerar el contrato.
- **Suite completa del backend en la PC:** 3199 passed y 17 failed. Los 17 son de PDF: WeasyPrint no encuentra GTK/Pango en Windows. Es del entorno y no tiene que ver con el ticket. `ruff`, `ruff format` y `mypy` dieron limpio.
- **Modelos:** tests sonnet, implementación, refactor y fix sonnet, review opus. No hubo escalados.
- **DEC-0029 está en revisión:** el PR no se mergea hasta que la ratifiquen Nahuel y Paloma.
