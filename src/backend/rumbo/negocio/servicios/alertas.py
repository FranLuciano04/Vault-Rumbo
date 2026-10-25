"""Servicio de alertas: la agenda de cada usuario y las operaciones que usan los demás módulos
(CU-14, RF-073, RF-074, RF-079)."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import Conflicto
from rumbo.core.fechas import hoy, limites_del_dia
from rumbo.datos.modelos import Alerta, EstadoAlerta, TipoAlerta, Usuario
from rumbo.datos.repositorios.alertas import (
    ContextoDeAlerta as ContextoDeAlerta,  # el router lo toma de acá
)
from rumbo.datos.repositorios.alertas import (
    OrigenAlerta,
    RepositorioAlertas,
    columna_de_origen,
)
from rumbo.negocio.estados import alerta as estado
from rumbo.negocio.politicas import es_direccion, visibilidad

_alertas = RepositorioAlertas()


async def listar_agenda(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    proximas: bool,
    estado: EstadoAlerta | None,
    tipo: TipoAlerta | None,
    hasta: date | None,
    propietario_id: uuid.UUID | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[tuple[Alerta, ContextoDeAlerta]], int]:
    """Página de la agenda con el contexto de cada alerta, y el total (CU-14, RF-074, RF-154).

    Por defecto las pendientes de fecha `<= hoy`; con `proximas`, las de fecha posterior. Admin y
    dueño ven toda la agencia y filtran por `propietario_id` (RF-078); el resto ve solo las suyas
    e ignora `propietario_id`. `hasta` es un tope dentro de la ventana: sin `proximas`,
    `fecha <= min(hoy, hasta)`; con `proximas`, `hoy < fecha <= hasta`. El contexto sale
    filtrado por la visibilidad del actor (RF-151)."""
    if not es_direccion(actor):
        propietario_id = None
    vista = visibilidad(actor)
    pagina, total = await _alertas.paginar(
        sesion,
        hoy=hoy(),
        proximas=proximas,
        estado=estado or EstadoAlerta.pendiente,
        tipo=tipo,
        hasta=hasta,
        propietario_id=propietario_id,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=vista,
    )
    contextos = await _alertas.contextos(sesion, pagina, visibilidad=vista)
    return [(a, contextos[a.id]) for a in pagina], total


async def obtener_alerta(
    sesion: AsyncSession, actor: Usuario, alerta_id: uuid.UUID
) -> tuple[Alerta, ContextoDeAlerta]:
    """Una alerta con su contexto (RF-075). La ajena para quien no es admin ni dueño es
    `NoEncontrado`, igual que una inexistente (RF-078)."""
    alerta = await _alertas.obtener(sesion, alerta_id, visibilidad=visibilidad(actor))
    return await _con_contexto(sesion, actor, alerta)


async def _con_contexto(
    sesion: AsyncSession, actor: Usuario, alerta: Alerta
) -> tuple[Alerta, ContextoDeAlerta]:
    contextos = await _alertas.contextos(sesion, [alerta], visibilidad=visibilidad(actor))
    return alerta, contextos[alerta.id]


async def marcar_vista(
    sesion: AsyncSession, actor: Usuario, alerta_id: uuid.UUID
) -> tuple[Alerta, ContextoDeAlerta]:
    """Pasa una alerta pendiente a vista (CU-14, RF-076)."""
    alerta = await _alertas.obtener_para_modificar(
        sesion, alerta_id, visibilidad=visibilidad(actor)
    )
    estado.marcar_vista(alerta)
    await sesion.flush()
    return await _con_contexto(sesion, actor, alerta)


async def resolver(
    sesion: AsyncSession, actor: Usuario, alerta_id: uuid.UUID
) -> tuple[Alerta, ContextoDeAlerta]:
    """Resuelve a mano una alerta pendiente o vista (CU-14, RF-076). La de pago no: se
    resuelve sola al cobrar el `Pago` o al registrar el pago al proveedor (CU-14 A2, CU-09 A4,
    RF-079)."""
    alerta = await _alertas.obtener_para_modificar(
        sesion, alerta_id, visibilidad=visibilidad(actor)
    )
    if alerta.tipo is TipoAlerta.pago:
        cuando = (
            "al registrar el pago al proveedor" if alerta.viaje_hotel_id else "al cobrar el pago"
        )
        raise Conflicto(f"Una alerta de pago no se resuelve a mano: se resuelve {cuando}.")
    estado.resolver(alerta, datetime.now(UTC))
    await sesion.flush()
    return await _con_contexto(sesion, actor, alerta)


async def posponer(
    sesion: AsyncSession, actor: Usuario, alerta_id: uuid.UUID, nueva_fecha: date
) -> tuple[Alerta, ContextoDeAlerta]:
    """Mueve una alerta pendiente a una fecha futura (CU-14, RF-077)."""
    alerta = await _alertas.obtener_para_modificar(
        sesion, alerta_id, visibilidad=visibilidad(actor)
    )
    estado.posponer(alerta, nueva_fecha)
    await sesion.flush()
    return await _con_contexto(sesion, actor, alerta)


async def progreso_del_dia(sesion: AsyncSession, actor: Usuario) -> tuple[int, int]:
    """`(resueltas_hoy, total_del_dia)` del actor; admin y dueño, de toda la agencia (RF-155).
    El total son las resueltas hoy más las pendientes y vistas de fecha `<= hoy`; el día es el
    de Argentina."""
    dia = hoy()
    desde, hasta = limites_del_dia(dia)
    return await _alertas.contar_del_dia(
        sesion, hoy=dia, desde=desde, hasta=hasta, visibilidad=visibilidad(actor)
    )


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
