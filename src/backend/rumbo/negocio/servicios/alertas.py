"""Servicio de alertas para los demás módulos (CU-14, RF-073, RF-079)."""

from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Alerta, EstadoAlerta, TipoAlerta, Usuario
from rumbo.datos.repositorios.alertas import OrigenAlerta, RepositorioAlertas, columna_de_origen
from rumbo.negocio.estados import alerta as estado

_alertas = RepositorioAlertas()


async def _con_id(sesion: AsyncSession, origen: OrigenAlerta) -> None:
    """Un origen recién agregado todavía no tiene id: se lo da el flush. Sin id, filtrar por
    él compararía contra NULL y alcanzaría alertas ajenas."""
    if origen.id is None:
        await sesion.flush()
    if origen.id is None:
        raise ValueError(f"{type(origen).__name__} sin id: hay que agregarlo a la sesión")


async def crear(
    sesion: AsyncSession,
    tipo: TipoAlerta,
    fecha: date,
    descripcion: str,
    propietario: Usuario,
    origen: OrigenAlerta | None = None,
) -> Alerta:
    """Crea una alerta pendiente en la agenda de `propietario` (RF-073). `origen` es la
    entidad que la dispara (`Viaje`, `Pago`, `Oportunidad`, `Cliente` o `ViajeHotel`); `None`
    es una manual suelta. La `fecha` la calcula quien llama, con `core.fechas.hoy()` como día
    de negocio (hora de Argentina)."""
    campos = {}
    if origen is not None:
        await _con_id(sesion, origen)
        campos = {columna_de_origen(origen): origen.id}
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


async def resolver_de_origen(
    sesion: AsyncSession,
    origen: OrigenAlerta,
    tipos: tuple[TipoAlerta, ...] | None = None,
    *,
    por_cancelacion: bool = False,
) -> list[Alerta]:
    """Resuelve las alertas pendientes o vistas de `origen` (solo de esos `tipos`, si se
    piden) y devuelve las que cambiaron (RF-079). `por_cancelacion` las marca como cerradas por
    la cancelación del `Viaje` (CU-27)."""
    await _con_id(sesion, origen)
    abiertas = await _alertas.listar_de_origen(
        sesion, origen, (EstadoAlerta.pendiente, EstadoAlerta.vista), tipos
    )
    ahora = datetime.now(UTC)
    for alerta in abiertas:
        estado.resolver(alerta, ahora)
        alerta.cerrada_por_cancelacion = por_cancelacion
    await sesion.flush()
    return abiertas


async def reabrir_de_origen(
    sesion: AsyncSession, origen: OrigenAlerta, *, solo_por_cancelacion: bool = False
) -> list[Alerta]:
    """Reabre las alertas resueltas de `origen` y devuelve las que cambiaron (RF-079). Con
    `solo_por_cancelacion` deja las que se resolvieron a mano (CU-27 A3)."""
    await _con_id(sesion, origen)
    resueltas = await _alertas.listar_de_origen(
        sesion,
        origen,
        (EstadoAlerta.resuelta,),
        por_cancelacion=True if solo_por_cancelacion else None,
    )
    for alerta in resueltas:
        estado.reabrir(alerta)
    await sesion.flush()
    return resueltas
