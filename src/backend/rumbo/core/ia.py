"""Cliente de IA (DEC-0012): interfaz única, modelo falso para tests/CI/demos y modelo real."""

import json
import logging
from typing import TYPE_CHECKING, Protocol

import httpx
from pydantic import SecretStr

from rumbo.core.config import Settings
from rumbo.core.errores import ServicioExterno

if TYPE_CHECKING:
    from langchain_anthropic import ChatAnthropic

logger = logging.getLogger(__name__)

_MODELO_CLAUDE = "claude-sonnet-5-5"
_MAX_TOKENS = 1024  # alcanza para un posteo de redes y pone tope al costo de cada llamada
_TIMEOUT_SEGUNDOS = 60
_REINTENTOS = 1
_URL_NVIDIA = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODELO_NVIDIA = "mistralai/mistral-large-4-1t-a52b"
_MAX_TOKENS_NVIDIA = 4096  # Mistral razona antes de responder y el tope incluye ese razonamiento
FALLA_IA = "No se pudo generar el texto con el servicio de IA."


class ModeloIA(Protocol):
    async def generar(self, prompt: str) -> str: ...


_SALIDA_FALSA = json.dumps(
    ["Primer borrador generado por el modelo falso.", "Segundo borrador del modelo falso."],
    ensure_ascii=False,
)


class ModeloFalso:
    """Devuelve siempre la misma salida, sin red: para tests, CI y demos. Por defecto, la lista
    JSON de 2 textos que espera la propuesta de contenido (DEC-0027)."""

    def __init__(self, salida: str = _SALIDA_FALSA) -> None:
        self._salida = salida

    async def generar(self, prompt: str) -> str:
        return self._salida


class _ClienteClaude:
    def __init__(self, chat: "ChatAnthropic") -> None:
        self._chat = chat

    async def generar(self, prompt: str) -> str:
        """Cualquier falla del modelo, o una respuesta sin texto, es `ServicioExterno` (502) con
        un mensaje genérico; el detalle va al log, sin el prompt."""
        try:
            respuesta = await self._chat.ainvoke(prompt)
        except Exception as error:
            logger.error("Falló la llamada al modelo de IA (%s)", type(error).__name__)
            raise ServicioExterno(FALLA_IA) from error
        texto = respuesta.text
        if not texto.strip():
            logger.error("El modelo de IA respondió sin texto")
            raise ServicioExterno(FALLA_IA)
        return texto


def _construir_cliente_claude(api_key: SecretStr) -> ModeloIA:
    """Único punto de construcción del cliente real de Claude: la guardia autouse de
    `tests/conftest.py` lo parchea para que ningún test llame a la API."""
    return _ClienteClaude(_crear_chat(api_key))


class _ClienteNvidia:
    def __init__(self, api_key: SecretStr, cliente_http: httpx.AsyncClient) -> None:
        self._api_key = api_key
        self._cliente_http = cliente_http

    async def generar(self, prompt: str) -> str:
        """Mismo contrato de fallas que Claude: `ServicioExterno` (502) genérico; el log lleva solo
        el tipo del error, sin prompt, clave ni `str(error)`."""
        try:
            respuesta = await self._cliente_http.post(
                _URL_NVIDIA,
                headers={"Authorization": f"Bearer {self._api_key.get_secret_value()}"},
                json={
                    "model": _MODELO_NVIDIA,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": _MAX_TOKENS_NVIDIA,
                },
            )
            respuesta.raise_for_status()
            texto = respuesta.json()["choices"][0]["message"]["content"]
        except Exception as error:
            logger.error("Falló la llamada al modelo de IA (%s)", type(error).__name__)
            raise ServicioExterno(FALLA_IA) from error
        if not isinstance(texto, str) or not texto.strip():
            logger.error("El modelo de IA respondió sin texto")
            raise ServicioExterno(FALLA_IA)
        return texto


def _construir_cliente_nvidia(api_key: SecretStr) -> ModeloIA:
    """Único punto de construcción del cliente real de NVIDIA: la guardia autouse de
    `tests/conftest.py` lo parchea para que ningún test llame a la API."""
    return _ClienteNvidia(api_key, httpx.AsyncClient(timeout=_TIMEOUT_SEGUNDOS))


def _crear_chat(api_key: SecretStr) -> "ChatAnthropic":
    """Configura el chat de LangChain; construirlo no llama a la API."""
    from langchain_anthropic import ChatAnthropic  # diferido: solo se importa con IA real

    return ChatAnthropic(  # type: ignore[call-arg]
        model=_MODELO_CLAUDE,
        api_key=api_key,
        max_tokens=_MAX_TOKENS,
        timeout=_TIMEOUT_SEGUNDOS,
        max_retries=_REINTENTOS,
    )


def obtener_modelo_ia(settings: Settings) -> ModeloIA:
    if settings.ia_modelo == "falso":
        return ModeloFalso()
    if settings.ia_modelo == "nvidia":
        clave_nvidia = settings.nvidia_api_key
        if not clave_nvidia or not clave_nvidia.get_secret_value():
            raise ServicioExterno("Falta NVIDIA_API_KEY para usar IA_MODELO=nvidia")
        return _construir_cliente_nvidia(clave_nvidia)
    clave = settings.anthropic_api_key
    if not clave or not clave.get_secret_value():
        raise ServicioExterno("Falta ANTHROPIC_API_KEY para usar IA_MODELO=claude")
    return _construir_cliente_claude(clave)
