from collections.abc import AsyncIterator
from typing import Any


def crear_motor(url: str) -> Any:
    raise NotImplementedError


def crear_fabrica_sesiones(motor: Any) -> Any:
    raise NotImplementedError


async def sesion_por_pedido(fabrica: Any) -> AsyncIterator[Any]:
    raise NotImplementedError
    yield


async def obtener_sesion() -> AsyncIterator[Any]:
    raise NotImplementedError
    yield
