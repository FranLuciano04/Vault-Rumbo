---
id: T-131
titulo: Generar borradores de contenido con IA
modulo: M9 — Redes e IA
capa: backend
estado: hecho
depende_de: [T-130, T-013]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-20, RF-119, RF-120, RF-122, RNF-16, DEC-0012]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 09/11/26 18:49
rama: feature/T-131-generar-borradores-de-contenido-con-ia
pr:
---
# T-131 Generar borradores de contenido con IA

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Quien tiene acceso a redes pide a la IA borradores de contenido a partir de un pedido acotado; el prompt está versionado en el repo y **nunca** incluye datos de clientes.

## Criterios de aceptación
- [ ] `POST /contenidos/propuestas-ia` arma el prompt de `negocio/prompts/contenido_red.py` (según IA — Prompt de CU-20) y devuelve borradores sin guardarlos (RF-119).
- [ ] El contexto que se envía se limita a lo que define RF-120: ningún dato de clientes ni de viajes concretos (RNF-16).
- [ ] Regenerar o descartar no persiste nada (A1, A2; RF-122); un error de la IA → 502 problem+json.

## Tests esperados
`tests/api/test_propuesta_ia.py` con el modelo falso: `test_rf119_devuelve_borradores`, `test_rf120_sin_datos_de_clientes` (inspecciona el prompt enviado), `test_rf122_no_persiste`, `test_error_ia_502`.

## Contexto (leer solo esto)
- [[CU-20 Generar propuesta de contenido con IA]]
- [[IA — Prompt de CU-20]]
- [[DEC-0012 Modelo de IA del producto|DEC-0012]]
- [[Spec de implementación]] §7 (Nunca)

## Archivos probables
- `src/backend/rumbo/negocio/prompts/contenido_red.py`
- `src/backend/rumbo/negocio/servicios/redes.py`

## Fuera de alcance
- Guardar el borrador (se hace con `POST /contenidos`, RF-121).

## Notas de implementación
- **Prompt:** `negocio/prompts/contenido_red.py` copia literal el prompt de sistema de [[IA — Prompt de CU-20]] (todavía `borrador`: si el equipo lo cambia, hay que actualizar el archivo) y agrega solo tema, canal y tono opcional, delimitados entre `<pedido>…</pedido>`. Va como un único texto porque `ModeloIA.generar` recibe un string.
- **Respuesta (verde inicial, reemplazada por DEC-0027):** un solo borrador por pedido; su `titulo` es el tema recortado a 200 caracteres (máximo de `ContenidoRed.titulo`), para poder guardarlo tal cual con `POST /contenidos`.
- **Contrato:** se quitó el caso 501 de `propuestas-ia` de `test_contrato_m9.py` (como hizo T-130); el acceso por rol sigue cubierto por los 403 de `RUTAS_HTTP`.
- **Review de seguridad (sonnet), arreglado en el fix:** `core/ia.py` ahora fija `max_tokens=1024`, convierte cualquier falla de la IA o respuesta vacía en `ServicioExterno` (502 genérico, detalle solo en el log) y suma 3 tests en `tests/negocio/test_ia.py` (agregados con `--tocar-tests`).
- **Quedó afuera:** límite de pedidos por usuario sobre el endpoint (funcionalidad nueva, a decidir si va como ticket). Menor: la UI debe escapar el texto del borrador.
- **Checks locales:** ruff, formato y mypy en verde; suite completa del backend 3111 passed, cobertura 99 %. 17 fallos ajenos al ticket: PDF con WeasyPrint sin GTK en esta PC (`libgobject-2.0-0`), los cubre el CI.
- **Modelos:** tests sonnet, implementación y refactor opus, review sonnet. Sin escalados.
- **Decisión de Paloma (09/11/26), [[DEC-0027 Título y cantidad de borradores de la IA|DEC-0027]]:** `BorradorContenido.titulo` es el `tema` del pedido, recortado a 200 caracteres. Cada pedido devuelve 2 borradores en una sola llamada con salida estructurada. Si no vienen 2 textos válidos, se responde 502. Sumar `test_rf119_devuelve_dos_borradores_con_el_tema_como_titulo`.
