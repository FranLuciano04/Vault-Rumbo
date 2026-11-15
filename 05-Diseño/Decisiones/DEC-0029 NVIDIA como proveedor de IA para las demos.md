---
tipo: decision
estado: en-revision
modulo: [M9, M12]
decisores: [Francisco]
fecha_aprobacion:
supersede:
actualizado: 15/11/26
---
# DEC-0029 NVIDIA como proveedor de IA para las demos

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> 🟡 **Propuesta por Francisco el 15/11/26.** Falta la ratificación de Nahuel y Paloma. Amplía [[DEC-0012 Modelo de IA del producto|DEC-0012]] sin reemplazarla.

## Contexto
[[CU-20 Generar propuesta de contenido con IA|CU-20]] usa hoy el modelo falso (`IA_MODELO=falso`) en desarrollo y en las demos, porque el modelo real de [[DEC-0012 Modelo de IA del producto|DEC-0012]] (Claude Sonnet 5.5) exige una clave paga de Anthropic. Con el modelo falso, la demo siempre muestra los mismos dos borradores fijos y no se ve qué hace la IA de verdad.

NVIDIA ofrece en build.nvidia.com acceso de prueba gratuito a varios modelos mediante una API compatible con OpenAI (`https://integrate.api.nvidia.com/v1/chat/completions`), con una clave `nvapi-…`.

## Decisión
- Sumar un tercer valor a la configuración: `IA_MODELO=nvidia`, que usa **Nemotron 3 Ultra** (`nvidia/nemotron-3-ultra-550b-a55b`) en NVIDIA, con el razonamiento apagado (`chat_template_kwargs: {"enable_thinking": false}`). La clave es `NVIDIA_API_KEY` y sale solo del entorno, nunca de Git.
- Es **para desarrollo y demos**. El modelo de producción sigue siendo el de [[DEC-0012 Modelo de IA del producto|DEC-0012]] (`IA_MODELO=claude`), y el valor por defecto sigue siendo `falso`.
- Se respetan las reglas de DEC-0012: el modelo **no recibe datos de clientes** ni publica nada. El prompt es el mismo de [[IA — Prompt de CU-20]] y la salida es la que fija [[DEC-0027 Título y cantidad de borradores de la IA|DEC-0027]].
- La llamada se hace con `httpx`, que ya está instalado en el backend: hoy figura como dependencia de desarrollo y llega en runtime por `fastapi[standard]` y `langchain-anthropic`. No se suma ningún paquete nuevo.
- Como el plan gratuito tiene latencia variable, la llamada tiene un timeout de 180 s y nginx espera hasta 200 s en `/api/`.

## Alternativas consideradas
Mediciones del 15/11/26 con la misma clave. El pedido fue un posteo de Instagram en rioplatense, con 3 corridas por modelo.

| Opción | Latencia | Texto | ¿Elegida? |
|---|---|---|---|
| Nemotron 3 Ultra 550B, sin razonamiento | 4 a 10 s | El mejor: rioplatense natural, llamado a la acción y hashtags correctos | ✅ (propuesta) |
| Mistral Large 4 (razonamiento `low`) | De 8 a más de 180 s | Bueno cuando responde | ❌ (fue la primera opción; se descartó por la latencia) |
| Nemotron 3.5 Lightning 30B, sin razonamiento | ~1 s | Más flojo: inventa hashtags y mezcla registros | ❌ |
| GLM 5.3 Flash y gpt-oss-20b | 130 s o timeout | Con razonamiento, gastan los tokens sin escribir el posteo | ❌ |
| Usar Claude también en las demos | — | Es lo que va a producción, pero exige una clave paga | ❌ |
| Seguir con el modelo falso | — | La demo no muestra la IA real | ❌ |

## Justificación
Permite mostrar y probar CU-20 con un modelo real y gratuito, con una espera aceptable para una demo, sin cambiar el modelo de producción ni la interfaz `ModeloIA` del backend.

## Impacto
- `src/backend/rumbo/core/ia.py` y `core/config.py`; `src/backend/.env.example`; `src/infra/nginx.conf`.
- [[T-182 Sumar Mistral en NVIDIA como modelo de IA para las demos|T-182]] (el título conserva el nombre del primer modelo).

## Decisores y fecha
- Propuesta: Francisco (15/11/26). **Pendiente** la ratificación de Nahuel y Paloma.

## Vínculo con el código (a partir de PC2)
- Rama: `feature/T-182-sumar-mistral-en-nvidia-como-modelo-de-i` · Commits: ver el PR de T-182
