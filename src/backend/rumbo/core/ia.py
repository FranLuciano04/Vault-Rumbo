"""Cliente de IA (DEC-0012): interfaz única, modelo falso para tests/CI/demos y modelo real."""

from typing import TYPE_CHECKING, Protocol

from pydantic import SecretStr

from rumbo.core.config import Settings
from rumbo.core.errores import ServicioExterno

if TYPE_CHECKING:
    from langchain_anthropic import ChatAnthropic

_MODELO_CLAUDE = "claude-sonnet-5-5"


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
        respuesta = await self._chat.ainvoke(prompt)
        return str(respuesta.content)


def _construir_cliente_claude(api_key: str) -> ModeloIA:
    from langchain_anthropic import ChatAnthropic  # diferido: solo se importa con IA real

    return _ClienteClaude(ChatAnthropic(model=_MODELO_CLAUDE, api_key=SecretStr(api_key)))  # type: ignore[call-arg]


def obtener_modelo_ia(settings: Settings) -> ModeloIA:
    if settings.ia_modelo == "falso":
        return ModeloFalso()
    if not settings.anthropic_api_key:
        raise ServicioExterno("Falta ANTHROPIC_API_KEY para usar IA_MODELO=claude")
    return _construir_cliente_claude(settings.anthropic_api_key)
