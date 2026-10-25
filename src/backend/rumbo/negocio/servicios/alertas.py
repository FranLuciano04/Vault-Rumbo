"""Servicio de alertas para los demás módulos (CU-14, RF-073, RF-079)."""

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Alerta, EstadoAlerta, TipoAlerta, Usuario
from rumbo.datos.repositorios.alertas import RepositorioAlertas, columna_de_origen
from rumbo.negocio.estados import alerta as estado

_alertas = RepositorioAlertas()


async def crear(
    sesion: AsyncSession,
    tipo: TipoAlerta,
    fecha: date,
    descripcion: str,
    propietario: Usuario,
    origen: Any | None = None,
) -> Alerta:
    """Crea una alerta pendiente en la agenda de `propietario` (RF-073). `origen` es la
    entidad que la dispara (`Viaje`, `Pago`, `Oportunidad`, `Cliente` o `ViajeHotel`); `None`
    es una manual suelta."""
    campos = {} if origen is None else {columna_de_origen(origen): origen.id}
    alerta = Alerta(
        tipo=tipo,
        fecha=fecha,
        descripcion=descripcion,
        propietario_id=propietario.id,
        estado=EstadoAlerta.pendiente,
        **campos,
    )
    sesion.add(alerta)
    await sesion.flush()
    return alerta


async def resolver_de_origen(sesion: AsyncSession, origen: Any) -> list[Alerta]:
    """Resuelve las alertas pendientes o vistas de `origen` y devuelve las que cambiaron
    (RF-079)."""
    abiertas = await _alertas.listar_de_origen(
        sesion, origen, (EstadoAlerta.pendiente, EstadoAlerta.vista)
    )
    ahora = datetime.now(UTC)
    for alerta in abiertas:
        estado.resolver(alerta, ahora)
    await sesion.flush()
    return abiertas


async def reabrir_de_origen(sesion: AsyncSession, origen: Any) -> list[Alerta]:
    """Reabre las alertas resueltas de `origen` y devuelve las que cambiaron (RF-079)."""
    resueltas = await _alertas.listar_de_origen(sesion, origen, (EstadoAlerta.resuelta,))
    for alerta in resueltas:
        estado.reabrir(alerta)
    await sesion.flush()
    return resueltas
