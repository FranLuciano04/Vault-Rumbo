"""Proceso automático diario (RNF-05, RNF-13): corre los pasos registrados con la fecha de
negocio, cada uno en su propia transacción.

Cada paso tiene que ser idempotente: correr el proceso dos veces el mismo día no duplica efectos.
Un paso que falla se revierte y se registra, pero no frena a los demás. La auditoría queda sin
autor (`usuario_auditoria` en `None`, RF-152).
"""

import logging
from collections.abc import Awaitable, Callable, Sequence
from contextlib import AbstractAsyncContextManager
from dataclasses import dataclass
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.seguridad import usuario_auditoria

logger = logging.getLogger(__name__)

FabricaSesiones = Callable[[], AbstractAsyncContextManager[AsyncSession]]


@dataclass(frozen=True)
class Paso:
    """Un paso del proceso; `ejecutar` devuelve, si quiere, un texto con lo que hizo."""

    nombre: str
    ejecutar: Callable[[AsyncSession, date], Awaitable[str | None]]


@dataclass(frozen=True)
class ResultadoPaso:
    nombre: str
    ok: bool
    detalle: str | None


PASOS: list[Paso] = []
"""Registro de pasos que corre el proceso diario, en orden."""


async def correr(
    fabrica_sesiones: FabricaSesiones, fecha: date, pasos: Sequence[Paso] | None = None
) -> list[ResultadoPaso]:
    """Corre `pasos` (o `PASOS`) con `fecha`, cada uno con su sesión y sin autor de auditoría.

    Un paso que falla (incluso al abrir o revertir su sesión) queda `ok=False` y se registra en
    el log; los siguientes corren igual. `detalle` guarda solo el tipo del error: el texto puede
    traer datos de clientes (parámetros de SQL)."""
    resultados: list[ResultadoPaso] = []
    marca = usuario_auditoria.set(None)
    try:
        for paso in PASOS if pasos is None else pasos:
            try:
                detalle = await _correr_paso(fabrica_sesiones, paso, fecha)
            except Exception as error:  # noqa: BLE001 (un paso roto no frena a los demás)
                logger.exception("Proceso diario: el paso %s falló", paso.nombre)
                resultados.append(
                    ResultadoPaso(paso.nombre, ok=False, detalle=type(error).__name__)
                )
                continue
            logger.info(
                "Proceso diario: el paso %s terminó: %s", paso.nombre, detalle or "sin cambios"
            )
            resultados.append(ResultadoPaso(paso.nombre, ok=True, detalle=detalle))
    finally:
        usuario_auditoria.reset(marca)
    return resultados


async def _correr_paso(fabrica_sesiones: FabricaSesiones, paso: Paso, fecha: date) -> str | None:
    """Una transacción por paso: commit si anduvo, rollback si falló."""
    async with fabrica_sesiones() as sesion:
        try:
            detalle = await paso.ejecutar(sesion, fecha)
            await sesion.commit()
        except Exception:
            await sesion.rollback()
            raise
    return detalle
