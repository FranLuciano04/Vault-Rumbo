"""Repositorio del módulo alertas: `Alerta` (CU-14, RF-073, RF-079)."""

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    Destino,
    EstadoAlerta,
    Oportunidad,
    Pago,
    TipoAlerta,
    Usuario,
    Viaje,
    ViajeHotel,
)
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad

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


@dataclass(frozen=True)
class ViajeConDestino:
    viaje: Viaje
    destino: str


@dataclass(frozen=True)
class ContextoDeAlerta:
    """El responsable de una `Alerta` y la cadena de su origen (RF-075): un `Pago` trae su
    `Viaje` y su `Cliente`; un `Viaje` o una `Oportunidad`, su `Cliente`."""

    responsable: Usuario
    cliente: Cliente | None = None
    oportunidad: Oportunidad | None = None
    viaje: ViajeConDestino | None = None
    pago: Pago | None = None


async def _por_id[M](sesion: AsyncSession, modelo: type[M], ids: set[uuid.UUID]) -> dict[Any, M]:
    """Filas de `modelo` con esos ids, en una consulta."""
    if not ids:
        return {}
    filas = await sesion.scalars(select(modelo).where(modelo.id.in_(ids)))  # type: ignore[attr-defined]
    return {fila.id: fila for fila in filas}  # type: ignore[attr-defined]


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
        consulta = consulta.order_by(Alerta.fecha, Alerta.id)
        consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return list(await sesion.scalars(consulta))

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        hoy: date,
        proximas: bool,
        estado: EstadoAlerta,
        tipo: TipoAlerta | None,
        hasta: date | None,
        propietario_id: uuid.UUID | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Alerta], int]:
        """Página en `estado`, por fecha, y el total que cumple los filtros: las de fecha
        `<= hoy` (atrasadas incluidas) o, con `proximas`, las de fecha `> hoy`."""
        consulta = visibilidad.aplicar(select(Alerta), Alerta).where(Alerta.estado == estado)
        consulta = consulta.where(Alerta.fecha > hoy if proximas else Alerta.fecha <= hoy)
        if tipo is not None:
            consulta = consulta.where(Alerta.tipo == tipo)
        if hasta is not None:
            consulta = consulta.where(Alerta.fecha <= hasta)
        if propietario_id is not None:
            consulta = consulta.where(Alerta.propietario_id == propietario_id)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(Alerta.fecha, Alerta.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

    async def contextos(
        self, sesion: AsyncSession, alertas: list[Alerta]
    ) -> dict[uuid.UUID, ContextoDeAlerta]:
        """Contexto de cada `Alerta` en cinco consultas, sin importar cuántas sean. SIN filtro
        de visibilidad: el que llama ya filtró las alertas, y el origen de una alerta propia se
        muestra aunque el actor no vea la entidad."""
        usuarios = await _por_id(sesion, Usuario, {a.propietario_id for a in alertas})
        pagos = await _por_id(sesion, Pago, {a.pago_id for a in alertas if a.pago_id})
        tramos = await _por_id(
            sesion, ViajeHotel, {a.viaje_hotel_id for a in alertas if a.viaje_hotel_id}
        )
        viaje_ids = {a.viaje_id for a in alertas if a.viaje_id}
        viaje_ids |= {p.viaje_id for p in pagos.values()} | {t.viaje_id for t in tramos.values()}
        viajes = await _por_id(sesion, Viaje, viaje_ids)
        destinos = await _por_id(sesion, Destino, {v.destino_id for v in viajes.values()})
        oportunidades = await _por_id(
            sesion, Oportunidad, {a.oportunidad_id for a in alertas if a.oportunidad_id}
        )
        cliente_ids = {a.cliente_id for a in alertas if a.cliente_id}
        cliente_ids |= {v.cliente_id for v in viajes.values()}
        cliente_ids |= {o.cliente_id for o in oportunidades.values()}
        clientes = await _por_id(sesion, Cliente, cliente_ids)

        def contexto(alerta: Alerta) -> ContextoDeAlerta:
            pago = pagos.get(alerta.pago_id)
            tramo = tramos.get(alerta.viaje_hotel_id)
            viaje_id = alerta.viaje_id or (pago and pago.viaje_id) or (tramo and tramo.viaje_id)
            viaje = viajes.get(viaje_id)
            oportunidad = oportunidades.get(alerta.oportunidad_id)
            cliente_id = (
                alerta.cliente_id
                or (viaje and viaje.cliente_id)
                or (oportunidad and oportunidad.cliente_id)
            )
            return ContextoDeAlerta(
                responsable=usuarios[alerta.propietario_id],
                cliente=clientes.get(cliente_id),
                oportunidad=oportunidad,
                viaje=None
                if viaje is None
                else ViajeConDestino(viaje, destinos[viaje.destino_id].nombre),
                pago=pago,
            )

        return {a.id: contexto(a) for a in alertas}
