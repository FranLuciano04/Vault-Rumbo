"""Cliente de IA (DEC-0012): interfaz única, modelo falso para tests/CI/demos y modelo real."""

from typing import TYPE_CHECKING, Protocol

import anthropic
from pydantic import SecretStr

from rumbo.core.config import Settings
from rumbo.core.errores import ServicioExterno

if TYPE_CHECKING:
    from langchain_anthropic import ChatAnthropic

_MODELO_CLAUDE = "claude-sonnet-5-5"
_TIMEOUT_SEGUNDOS = 60
_REINTENTOS = 1


class ModeloIA(Protocol):
    async def generar(self, prompt: str) -> str: ...


class ModeloFalso:
    """Devuelve siempre la misma salida, sin red: para tests, CI y demos."""

    def __init__(self, salida: str = "Borrador generado por el modelo falso.") -> None:
        self._salida = salida

    async def generar(self, prompt: str) -> str:
        return self._salida


class _ClienteClaude:
    def __init__(self, chat: "ChatAnthropic") -> None:
        self._chat = chat

    async def generar(self, prompt: str) -> str:
        try:
            respuesta = await self._chat.ainvoke(prompt)
        except anthropic.APIError as error:
            raise ServicioExterno("No se pudo generar el texto con el servicio de IA.") from error
        return respuesta.text


def _construir_cliente_claude(api_key: SecretStr) -> ModeloIA:
    """Único punto de construcción del cliente real de Claude: la guardia autouse de
    `tests/conftest.py` lo parchea para que ningún test llame a la API."""
    from langchain_anthropic import ChatAnthropic  # diferido: solo se importa con IA real

    chat = ChatAnthropic(  # type: ignore[call-arg]
        model=_MODELO_CLAUDE, api_key=api_key, timeout=_TIMEOUT_SEGUNDOS, max_retries=_REINTENTOS
    )
    return _ClienteClaude(chat)


def obtener_modelo_ia(settings: Settings) -> ModeloIA:
    if settings.ia_modelo == "falso":
        return ModeloFalso()
    clave = settings.anthropic_api_key
    if not clave or not clave.get_secret_value():
        raise ServicioExterno("Falta ANTHROPIC_API_KEY para usar IA_MODELO=claude")
    return _construir_cliente_claude(clave)
