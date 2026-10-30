"""Servicio del módulo viajes: el avance manual del estado del viaje y su corrección (CU-08,
RF-039 a RF-042, EST-Viaje T4, T5 y T7)."""

import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import EstadoAlerta, EstadoViaje, TipoAlerta, Usuario, Viaje
from rumbo.datos.repositorios.alertas import RepositorioAlertas
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.datos.repositorios.viajes import RepositorioPagos, RepositorioViajes
from rumbo.negocio import calculos
from rumbo.negocio.estados import viaje as estado_viaje
from rumbo.negocio.politicas import exigir_escritura, visibilidad
from rumbo.negocio.servicios import alertas

_viajes = RepositorioViajes()
_pagos = RepositorioPagos()
_usuarios = RepositorioUsuarios()
_alertas = RepositorioAlertas()

_DESCRIPCION_RESENA = "El viaje terminó: pedile al cliente la reseña de los hoteles."


@dataclass
class FichaViaje:
    """El `Viaje` con lo que la API calcula de su plan de pagos (CU-12)."""

    viaje: Viaje
    saldo_pendiente: Decimal
    porcentaje_pagado: Decimal


async def iniciar(sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID) -> FichaViaje:
    """El empleado confirma que el viaje empezó: `confirmado` → `en_curso` (T4, RF-039). Desde
    otro estado es `TransicionInvalida`. Escribe el responsable, admin o dueño (DEC-0005)."""
    viaje = await _viaje_a_cambiar(sesion, actor, viaje_id)
    estado_viaje.iniciar(viaje)
    return await _guardar(sesion, actor, viaje)


async def finalizar(sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID) -> FichaViaje:
    """El empleado confirma que el viaje terminó: `en_curso` → `finalizado` (T5, RF-039), y queda
    agendada para hoy la alerta `resena` post-viaje en la agenda del responsable (RF-041)."""
    viaje = await _viaje_a_cambiar(sesion, actor, viaje_id)
    estado_viaje.finalizar(viaje)
    responsable = await _responsable(sesion, actor, viaje)
    await alertas.crear(sesion, TipoAlerta.resena, hoy(), _DESCRIPCION_RESENA, responsable, viaje)
    return await _guardar(sesion, actor, viaje)


async def corregir_estado(sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID) -> FichaViaje:
    """Deshace un paso manual cargado por error: `en_curso` → `confirmado` o `finalizado` →
    `en_curso` (T7, CU-08 A2, RF-042). Al deshacer `finalizado` cierra la alerta `resena` sin
    atender; las reseñas ya cargadas se conservan (DEC-0021). Los estados que produjo un cobro o
    la cancelación se deshacen por su propio flujo: `TransicionInvalida`."""
    viaje = await _viaje_a_cambiar(sesion, actor, viaje_id)
    sin_atender = (
        await _alertas.listar_de_origen(
            sesion, viaje, (EstadoAlerta.pendiente, EstadoAlerta.vista), (TipoAlerta.resena,)
        )
        if viaje.estado is EstadoViaje.finalizado
        else []
    )
    estado_viaje.corregir(viaje, alertas=sin_atender)
    return await _guardar(sesion, actor, viaje)


async def _viaje_a_cambiar(sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID) -> Viaje:
    """El viaje bloqueado hasta el fin de la transacción, si el actor puede modificarlo."""
    viaje = await _viajes.obtener_para_modificar(sesion, viaje_id, visibilidad=visibilidad(actor))
    exigir_escritura(actor, viaje)
    return viaje


async def _guardar(sesion: AsyncSession, actor: Usuario, viaje: Viaje) -> FichaViaje:
    """Guarda el cambio de estado y arma la ficha. Las vistas dependientes (calendario y
    dashboard) leen el estado de la base, así que el cambio se propaga al guardarlo (RF-040)."""
    await sesion.flush()
    await sesion.refresh(viaje)  # trae la auditoría que actualiza la base
    pagos = await _pagos.listar_de_viaje(sesion, viaje.id, visibilidad=visibilidad(actor))
    return FichaViaje(
        viaje=viaje,
        saldo_pendiente=calculos.saldo_pendiente(pagos),
        porcentaje_pagado=calculos.porcentaje_pagado(viaje.precio_venta, pagos),
    )


async def _responsable(sesion: AsyncSession, actor: Usuario, viaje: Viaje) -> Usuario:
    if actor.id == viaje.responsable_id:
        return actor
    return await _usuarios.obtener(sesion, viaje.responsable_id, visibilidad=visibilidad(actor))
