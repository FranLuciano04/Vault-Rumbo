"""Servicio de alertas para los demás módulos (CU-14, RF-073, RF-079)."""

from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Alerta, TipoAlerta, Usuario


async def crear(
    sesion: AsyncSession,
    tipo: TipoAlerta,
    fecha: date,
    descripcion: str,
    propietario: Usuario,
    origen: Any | None = None,
) -> Alerta:
    raise NotImplementedError


async def resolver_de_origen(sesion: AsyncSession, origen: Any) -> list[Alerta]:
    raise NotImplementedError


async def reabrir_de_origen(sesion: AsyncSession, origen: Any) -> list[Alerta]:
    raise NotImplementedError
