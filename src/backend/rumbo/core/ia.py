"""Cliente de IA (DEC-0012): interfaz única, modelo falso para tests/CI/demos y modelo real."""

from typing import Protocol

from rumbo.core.config import Settings


class ModeloIA(Protocol):
    async def generar(self, prompt: str) -> str: ...


class ModeloFalso:
    def __init__(self, salida: str = "") -> None:
        raise NotImplementedError("no implementado")

    async def generar(self, prompt: str) -> str:
        raise NotImplementedError("no implementado")


def _construir_cliente_claude(api_key: str) -> ModeloIA:
    raise NotImplementedError("no implementado")


def obtener_modelo_ia(settings: Settings) -> ModeloIA:
    raise NotImplementedError("no implementado")
