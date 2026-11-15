---
tipo: decision
estado: en-revision
modulo: [M9, M12]
decisores: [Francisco]
fecha_aprobacion:
supersede:
actualizado: 15/11/26
---
# DEC-0029 Mistral en NVIDIA como modelo de IA para las demos

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> 🟡 **Propuesta por Francisco el 15/11/26.** Falta la ratificación de Nahuel y Paloma. Amplía [[DEC-0012 Modelo de IA del producto|DEC-0012]] sin reemplazarla.

## Contexto
[[CU-20 Generar propuesta de contenido con IA|CU-20]] usa hoy el modelo falso (`IA_MODELO=falso`) en desarrollo y en las demos, porque el modelo real de [[DEC-0012 Modelo de IA del producto|DEC-0012]] (Claude Sonnet 5.5) exige una clave paga de Anthropic. Con el modelo falso, la demo siempre muestra los mismos dos borradores fijos y no se ve qué hace la IA de verdad.

NVIDIA ofrece en build.nvidia.com acceso de prueba gratuito a **Mistral Large 4** (`mistralai/mistral-large-4-1t-a52b`) mediante una API compatible con OpenAI (`https://integrate.api.nvidia.com/v1/chat/completions`), con una clave `nvapi-…`.

## Decisión
- Sumar un tercer valor a la configuración: `IA_MODELO=nvidia`, que usa **Mistral Large 4 en NVIDIA** con la clave `NVIDIA_API_KEY` (solo del entorno, nunca en Git).
- Es **para desarrollo y demos**. El modelo de producción sigue siendo el de [[DEC-0012 Modelo de IA del producto|DEC-0012]] (`IA_MODELO=claude`), y el valor por defecto sigue siendo `falso`.
- Se respetan las reglas de DEC-0012: el modelo **no recibe datos de clientes** ni publica nada; el prompt es el mismo de [[IA — Prompt de CU-20]] y la salida, la de [[DEC-0027 Título y cantidad de borradores de la IA|DEC-0027]].
- La llamada se hace con `httpx`, que ya está instalado en el backend (hoy como dependencia de desarrollo y, en runtime, por `fastapi[standard]` y `langchain-anthropic`). No se suma ningún paquete nuevo.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Mistral Large 4 en NVIDIA para demos | Gratuito para probar; texto real en español; API estándar | Plan de prueba con límites de uso; otro proveedor que mantener | ✅ (propuesta) |
| Usar Claude también en las demos | Un solo proveedor; es lo que va a producción | Exige clave paga | ❌ |
| Seguir con el modelo falso | Sin red ni costo | La demo no muestra la IA real | ❌ |

## Justificación
Permite mostrar y probar CU-20 con un modelo real sin costo, sin cambiar el modelo de producción ni la interfaz `ModeloIA` del backend.

## Impacto
- `src/backend/rumbo/core/ia.py` y `core/config.py`; `src/backend/.env.example`.
- [[T-182 Sumar Mistral en NVIDIA como modelo de IA para las demos|T-182]].

## Decisores y fecha
- Propuesta: Francisco (15/11/26). **Pendiente** la ratificación de Nahuel y Paloma.

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
