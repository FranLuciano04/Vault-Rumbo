"""Repositorio del módulo alertas: `Alerta` (CU-14, RF-073, RF-079)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    EstadoAlerta,
    Oportunidad,
    Pago,
    TipoAlerta,
    Viaje,
    ViajeHotel,
)
from rumbo.datos.repositorios.base import RepositorioBase

type OrigenAlerta = Viaje | Pago | Oportunidad | Cliente | ViajeHotel

# columna de `Alerta` que apunta a cada entidad que puede originarla
_COLUMNA_DE_ORIGEN = {
    Viaje: "viaje_id",
    Pago: "pago_id",
    Oportunidad: "oportunidad_id",
    Cliente: "cliente_id",
    ViajeHotel: "viaje_hotel_id",
}


def columna_de_origen(origen: OrigenAlerta) -> str:
    """Nombre de la columna de `Alerta` que guarda el id de `origen`."""
    try:
        return _COLUMNA_DE_ORIGEN[type(origen)]
    except KeyError:
        raise TypeError(f"{type(origen).__name__} no puede ser origen de una alerta") from None


class RepositorioAlertas(RepositorioBase[Alerta]):
    modelo = Alerta

    async def listar_de_origen(
        self,
        sesion: AsyncSession,
        origen: OrigenAlerta,
        estados: tuple[EstadoAlerta, ...],
        tipos: tuple[TipoAlerta, ...] | None = None,
        *,
        por_cancelacion: bool | None = None,
    ) -> list[Alerta]:
        """Alertas de `origen` en alguno de esos estados (y de esos tipos, si se piden;
        `por_cancelacion` filtra por la marca de cierre por cancelación), bloqueadas hasta el fin
        de la transacción. SIN filtro de visibilidad: solo para servicios de otros módulos que
        ya validaron el acceso a `origen`; no exponer a un endpoint."""
        columna = getattr(Alerta, columna_de_origen(origen))
        consulta = select(Alerta).where(columna == origen.id, Alerta.estado.in_(estados))
        if tipos is not None:
            consulta = consulta.where(Alerta.tipo.in_(tipos))
        if por_cancelacion is not None:
            consulta = consulta.where(Alerta.cerrada_por_cancelacion == por_cancelacion)
        consulta = consulta.order_by(Alerta.fecha, Alerta.id).with_for_update()
        return list(await sesion.scalars(consulta))
