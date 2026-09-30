---
tipo: analisis
estado: borrador
modulo: [redes]
responsable: Francisco
pc: pc2
actualizado: 30/09/26
---
# IA — Prompt de CU-20

tags:: #tipo/analisis #estado/borrador #pc/pc2

> ⏭️ **Fuera del PC1 (sync del 30/09/26):** el equipo decidió no incluirlo en la entrega, porque lo que pide el punto de control son los prompts usados para **construir** el producto guiado con IA (ver [[IA — Agentes del proyecto]] y `CLAUDE.md`). Queda como borrador para programar CU-20 en PC2.
>
> Prompt de ejemplo de la única función con IA del producto ([[CU-20 Generar propuesta de contenido con IA|CU-20]]), pedido en la sync del 30/09 para la sección «Selección de modelos y agentes de IA, con sus prompts» del documento del PC1. Es una **propuesta**: la redactó Francisco y la tiene que aprobar el equipo. El modelo y sus límites están decididos en [[DEC-0012 Modelo de IA del producto]]. En PC2 el prompt vive, versionado, en `negocio/prompts/contenido_red.py` ([[ARQ — Vista general]]).

## Cómo se arma el pedido
El servicio del módulo `redes` arma el pedido con LangChain en dos partes: un **prompt de sistema**, fijo, que define el rol y los límites, y un **prompt de usuario**, que se completa con las tres variables que carga el empleado. Se hace **una sola llamada** a Claude Sonnet 5.5 y se devuelve un borrador; si no convence, el empleado ajusta los datos y pide otro (A1).

| Variable | Qué es | Valores |
|---|---|---|
| `tema` | El destino, la oferta o la idea del posteo | Texto libre, obligatorio |
| `canal` | Dónde se va a publicar | `instagram`, `tiktok` o `whatsapp_ventas` (los canales de [[ContenidoRed]]) |
| `tono` | El objetivo del posteo | Texto libre, por ejemplo «promocionar un destino» o «anunciar una oferta» |

## Prompt de sistema
```text
Sos redactor de contenido para redes sociales de una agencia de turismo argentina.
Escribís en español de Argentina, con voseo, de forma cálida y clara.

Tu tarea es proponer UN borrador de posteo a partir del tema, el canal y el tono
que te indica una persona de la agencia. Esa persona lo va a revisar, corregir y
publicar a mano: vos no publicás nada.

Reglas:
- Usá solo la información del pedido. No inventes precios, fechas, cupos, nombres
  de hoteles ni promociones que no estén en el tema.
- Si el tema no alcanza para un dato concreto, dejá un marcador entre corchetes,
  por ejemplo [precio] o [fecha de salida], para que la persona lo complete.
- No incluyas datos personales de clientes.
- Adaptá el largo y el formato al canal:
  - instagram: hasta 120 palabras, un párrafo de gancho, una llamada a la acción
    y entre 3 y 6 hashtags al final.
  - tiktok: un guion corto para un video de 15 a 30 segundos, con las escenas en
    viñetas, y una línea de texto para la descripción.
  - whatsapp_ventas: un mensaje de difusión de hasta 60 palabras, sin hashtags,
    con una pregunta final que invite a responder.
- Respondé solo con el borrador, sin explicaciones ni comentarios.
```

## Prompt de usuario (plantilla)
```text
Tema: {tema}
Canal: {canal}
Tono u objetivo: {tono}
```

## Ejemplo
Datos que carga el empleado:

```text
Tema: Cataratas del Iguazú en 4 días, salida grupal en noviembre
Canal: instagram
Tono u objetivo: promocionar un destino
```

Borrador que podría devolver el modelo (ilustrativo, no es una salida real):

```text
¿Te imaginás sentir la fuerza de la Garganta del Diablo a pocos metros?
Te proponemos 4 días en las Cataratas del Iguazú, con salida grupal en noviembre:
senderos, lancha bajo los saltos y noches tranquilas en la selva misionera.
Cupos limitados. Escribinos y armamos tu lugar en el grupo. Desde [precio].

#CataratasDelIguazú #ViajarEnGrupo #Misiones #EscapadaArgentina
```

## Por qué así
- **Límites en el prompt de sistema:** son los de CU-20 y de la decisión sobre el modelo (no publica, no usa datos del negocio). Se suma no inventar datos comerciales, porque un precio o una fecha inventados en un posteo le generan un problema real a la agencia.
- **Marcadores entre corchetes:** hacen visible lo que la persona tiene que completar antes de publicar.
- **Formato por canal:** los tres canales de [[ContenidoRed]] piden textos distintos, y dejarlo en el prompt evita que el empleado tenga que explicarlo en cada pedido.
- **Sin parámetros explícitos:** se usan los valores por defecto del modelo, como se decidió al elegirlo.

## 🔎 Revisión
> [!question] Francisco (30/09) — propuesta para aprobar con el equipo: el prompt de sistema, el formato por canal (largos y hashtags) y la regla de los marcadores entre corchetes. El borrador del ejemplo está escrito a mano como ilustración; no es una respuesta real del modelo.
