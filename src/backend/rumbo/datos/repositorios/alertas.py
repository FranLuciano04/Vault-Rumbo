"""Repositorio del módulo alertas: `Alerta` (CU-14, RF-073, RF-079)."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    EstadoAlerta,
    Oportunidad,
    Pago,
    Viaje,
    ViajeHotel,
)
from rumbo.datos.repositorios.base import RepositorioBase

# columna de `Alerta` que apunta a cada entidad que puede originarla
_COLUMNA_DE_ORIGEN = {
    Viaje: "viaje_id",
    Pago: "pago_id",
    Oportunidad: "oportunidad_id",
    Cliente: "cliente_id",
    ViajeHotel: "viaje_hotel_id",
}


def columna_de_origen(origen: Any) -> str:
    """Nombre de la columna de `Alerta` que guarda el id de `origen`."""
    return _COLUMNA_DE_ORIGEN[type(origen)]


class RepositorioAlertas(RepositorioBase[Alerta]):
    modelo = Alerta

    async def listar_de_origen(
        self, sesion: AsyncSession, origen: Any, estados: tuple[EstadoAlerta, ...]
    ) -> list[Alerta]:
        """Alertas de `origen` en alguno de esos estados. Sin filtro de visibilidad: la llaman
        los servicios de otros módulos, que ya validaron el acceso a `origen`."""
        columna = getattr(Alerta, columna_de_origen(origen))
        consulta = select(Alerta).where(columna == origen.id, Alerta.estado.in_(estados))
        return list(await sesion.scalars(consulta.order_by(Alerta.fecha, Alerta.id)))
