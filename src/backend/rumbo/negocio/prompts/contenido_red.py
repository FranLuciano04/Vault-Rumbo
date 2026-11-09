"""Prompt de CU-20 (borrador en «IA — Prompt de CU-20», DEC-0012, DEC-0027).

Solo lleva lo que carga la persona: tema, canal y tono. Nunca datos de clientes, viajes ni
ventas (RF-120, RNF-16). La IA responde una lista JSON con los 2 textos.
"""

import json
import logging

from rumbo.core.errores import ServicioExterno
from rumbo.core.ia import FALLA_IA
from rumbo.datos.modelos import CanalContenido

logger = logging.getLogger(__name__)

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


def armar_prompt(*, tema: str, canal: CanalContenido, tono: str | None) -> str:
    """Prompt de sistema, formato de salida y el pedido, delimitado entre `<pedido>` y
    `</pedido>` para que lo que carga la persona no se mezcle con las instrucciones; sin tono,
    esa línea no va."""
    pedido = [f"Tema: {tema}", f"Canal: {canal.value}"]
    if tono:
        pedido.append(f"Tono u objetivo: {tono}")
    cuerpo = "\n".join(pedido)
    return f"{SISTEMA}\n\n{FORMATO_DE_SALIDA}\n\n<pedido>\n{cuerpo}\n</pedido>"


def leer_borradores(salida: str) -> list[str]:
    """Los textos de la respuesta. Si no es una lista JSON de exactamente 2 textos no vacíos,
    es una falla de la IA: `ServicioExterno` (502) con el mensaje genérico (DEC-0027)."""
    try:
        textos = json.loads(salida)
    except json.JSONDecodeError:
        textos = None
    validos = (
        isinstance(textos, list)
        and len(textos) == CANTIDAD_DE_BORRADORES
        and all(isinstance(t, str) and t.strip() for t in textos)
    )
    if not validos:
        logger.error("La IA respondió con un formato inválido para los borradores")
        raise ServicioExterno(FALLA_IA)
    return textos  # type: ignore[no-any-return]
