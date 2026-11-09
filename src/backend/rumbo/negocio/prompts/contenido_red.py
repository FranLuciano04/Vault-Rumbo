"""Prompt de CU-20 (borrador en «IA — Prompt de CU-20», DEC-0012, DEC-0027).

Solo lleva lo que carga la persona: tema, canal y tono. Nunca datos de clientes, viajes ni
ventas (RF-120, RNF-16). La IA responde una lista JSON con los 2 textos.
"""

from rumbo.datos.modelos import CanalContenido

CANTIDAD_DE_BORRADORES = 2

# Copia literal del prompt de sistema de la nota «IA — Prompt de CU-20».
SISTEMA = """\
Sos redactor de contenido para redes sociales de una agencia de turismo argentina.
Escribís en español de Argentina, con voseo, de forma cálida y clara.

Tu tarea es proponer DOS borradores de posteo, distintos entre sí, a partir del tema, el canal y el tono
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
- Respondé solo con los dos borradores, sin explicaciones ni comentarios."""  # noqa: E501

# Formato de la salida estructurada (DEC-0027); no es parte del texto de la nota.
FORMATO_DE_SALIDA = """\
Formato de la respuesta: solo una lista JSON con los dos borradores como strings, por ejemplo
["primer borrador", "segundo borrador"], sin texto antes ni después."""


def _sin_etiquetas(texto: str) -> str:
    """Evita que el pedido cierre `<pedido>` o abra otra etiqueta."""
    return texto.replace("<", "").replace(">", "")


def armar_prompt(*, tema: str, canal: CanalContenido, tono: str | None) -> str:
    """Prompt de sistema, formato de salida y el pedido, delimitado entre `<pedido>` y
    `</pedido>` para que lo que carga la persona no se mezcle con las instrucciones (por eso se le
    quitan `<` y `>`); sin tono, esa línea no va."""
    pedido = [f"Tema: {_sin_etiquetas(tema)}", f"Canal: {canal.value}"]
    if tono:
        pedido.append(f"Tono u objetivo: {_sin_etiquetas(tono)}")
    cuerpo = "\n".join(pedido)
    return f"{SISTEMA}\n\n{FORMATO_DE_SALIDA}\n\n<pedido>\n{cuerpo}\n</pedido>"
