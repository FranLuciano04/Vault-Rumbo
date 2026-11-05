"""Repositorio del módulo viajes: `Viaje` (CU-08, CU-10), sus `Pago` (CU-11, CU-12) y los tramos
de su itinerario (CU-09)."""

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import and_, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import (
    Alerta,
    EstadoAlerta,
    EstadoPago,
    EstadoViaje,
    Pago,
    TipoAlerta,
    Usuario,
    Viaje,
    ViajeHotel,
)
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


@dataclass(frozen=True)
class CandidatoAAvanzar:
    """Un `Viaje` al que el proceso diario le sugiere el próximo estado (CU-08 A1) y su
    responsable, si está activo."""

    viaje: Viaje
    responsable_activo_id: uuid.UUID | None


class RepositorioViajes(RepositorioBase[Viaje]):
    modelo = Viaje

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        estado: EstadoViaje | None,
        desde: date | None,
        hasta: date | None,
        cliente_id: uuid.UUID | None,
        responsable_id: uuid.UUID | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Viaje], int]:
        """Página ordenada por fecha de salida y el total que cumple los filtros; `desde` y
        `hasta` acotan la fecha de salida, inclusive; `responsable_id` deja los de ese `Usuario`."""
        consulta = visibilidad.aplicar(select(Viaje), Viaje)
        if estado is not None:
            consulta = consulta.where(Viaje.estado == estado)
        if desde is not None:
            consulta = consulta.where(Viaje.fecha_salida >= desde)
        if hasta is not None:
            consulta = consulta.where(Viaje.fecha_salida <= hasta)
        if cliente_id is not None:
            consulta = consulta.where(Viaje.cliente_id == cliente_id)
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(Viaje.fecha_salida, Viaje.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Viaje:
        """Como `obtener`, pero bloqueado hasta el fin de la transacción y releído de la base,
        para que dos cambios simultáneos de la economía o del plan no se pisen."""
        consulta = visibilidad.aplicar(select(Viaje).where(Viaje.id == id), Viaje)
        consulta = consulta.with_for_update(of=Viaje).execution_options(populate_existing=True)
        viaje = await sesion.scalar(consulta)
        if viaje is None:
            raise NoEncontrado(f"Viaje {id} no encontrado")
        return viaje

    async def existe_de_oportunidad(self, sesion: AsyncSession, oportunidad_id: uuid.UUID) -> bool:
        """Si la `Oportunidad` ya derivó en un viaje (a lo sumo uno, por la unicidad de
        `oportunidad_id`). Sin filtro de visibilidad: no expone la fila, y el viaje puede quedar
        fuera de la vista de quien ve la oportunidad (un freelance que no es su responsable)."""
        return bool(
            await sesion.scalar(select(exists().where(Viaje.oportunidad_id == oportunidad_id)))
        )

    async def existe_de_cliente(
        self, sesion: AsyncSession, *, cliente_id: uuid.UUID, destino_id: uuid.UUID
    ) -> bool:
        """Si el `Cliente` ya tiene un viaje a ese `Destino`, de cualquier estado. Sin filtro de
        visibilidad: solo para semillas."""
        return bool(
            await sesion.scalar(
                select(
                    exists().where(Viaje.cliente_id == cliente_id, Viaje.destino_id == destino_id)
                )
            )
        )

    async def para_sugerir_avance(
        self, sesion: AsyncSession, *, estado: EstadoViaje, hasta: date, sugerencia: str
    ) -> list[CandidatoAAvanzar]:
        """Viajes en `estado` cuya fecha de referencia (la salida si está `confirmado`, el
        regreso si no) es `<= hasta`, sin una `Alerta` `viaje` pendiente o vista (una pospuesta
        es una pendiente con fecha futura, y también cuenta) cuya descripción nombre la
        `sugerencia` (CU-08 A1, RF-039). Sin filtro de visibilidad: solo para el proceso
        diario, que no tiene actor; no exponer a un endpoint.

        Los deja bloqueados hasta el fin de la transacción, en orden de id, para que una
        transición de la API (`obtener_para_modificar`) no los invalide antes de que se inserte
        la alerta: o espera y resuelve la alerta ya creada, o confirmó antes y Postgres reevalúa
        el `estado` de la fila al soltarse el bloqueo y la descarta. Cada pedido bloquea un solo
        viaje, así que no se traba con el proceso aunque este llame una vez por `estado`.

        En la primera corrida, los viajes viejos que nunca se avanzaron reciben una alerta cada
        uno: es lo esperable, porque siguen pendientes de confirmar."""
        fecha = Viaje.fecha_salida if estado is EstadoViaje.confirmado else Viaje.fecha_regreso
        sugerencia_abierta = exists().where(
            Alerta.viaje_id == Viaje.id,
            Alerta.tipo == TipoAlerta.viaje,
            Alerta.estado.in_((EstadoAlerta.pendiente, EstadoAlerta.vista)),
            Alerta.descripcion.icontains(sugerencia, autoescape=True),
        )
        consulta = (
            select(Viaje, Usuario.id)
            .outerjoin(Usuario, and_(Usuario.id == Viaje.responsable_id, Usuario.activo.is_(True)))
            .where(Viaje.estado == estado, fecha <= hasta, ~sugerencia_abierta)
            .order_by(Viaje.id)
            # key_share = FOR NO KEY UPDATE: no frena a quien referencia el viaje (pago, alerta).
            .with_for_update(of=Viaje, key_share=True)
        )
        filas = await sesion.execute(consulta)
        return [CandidatoAAvanzar(viaje, responsable_id) for viaje, responsable_id in filas]


class RepositorioPagos(RepositorioBase[Pago]):
    modelo = Pago

    async def listar_de_viaje(
        self, sesion: AsyncSession, viaje_id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> list[Pago]:
        """Los pagos del viaje, anulados incluidos, por vencimiento."""
        consulta = visibilidad.aplicar(select(Pago).where(Pago.viaje_id == viaje_id), Pago)
        return list(await sesion.scalars(consulta.order_by(Pago.vencimiento, Pago.id)))

    async def listar_de_viajes(
        self, sesion: AsyncSession, viaje_ids: list[uuid.UUID], *, visibilidad: Visibilidad
    ) -> list[Pago]:
        """Los pagos de varios viajes, anulados incluidos, por vencimiento."""
        consulta = visibilidad.aplicar(select(Pago).where(Pago.viaje_id.in_(viaje_ids)), Pago)
        return list(await sesion.scalars(consulta.order_by(Pago.vencimiento, Pago.id)))

    async def pendientes_vencidos_para_modificar(
        self, sesion: AsyncSession, *, antes_de: date
    ) -> list[Pago]:
        """Pagos `pendiente` con `vencimiento < antes_de`, bloqueados hasta el fin de la
        transacción y releídos, para no pisar un cobro simultáneo (EST-Pago T3). Sin filtro de
        visibilidad: solo para el proceso diario, que no tiene actor; no exponer a un endpoint."""
        consulta = (
            select(Pago)
            .where(Pago.estado == EstadoPago.pendiente, Pago.vencimiento < antes_de)
            .order_by(Pago.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return list(await sesion.scalars(consulta))


class RepositorioTramos(RepositorioBase[ViajeHotel]):
    modelo = ViajeHotel

    async def listar_de_viaje(
        self, sesion: AsyncSession, viaje_id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> list[ViajeHotel]:
        """Los tramos del itinerario del viaje, por `orden`."""
        consulta = visibilidad.aplicar(
            select(ViajeHotel).where(ViajeHotel.viaje_id == viaje_id), ViajeHotel
        )
        return list(await sesion.scalars(consulta.order_by(ViajeHotel.orden)))
