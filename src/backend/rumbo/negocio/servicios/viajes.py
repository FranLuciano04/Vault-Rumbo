"""Servicio del módulo viajes: la confirmación de la reserva que crea el viaje (CU-07, RF-032 a
RF-036, EST-Viaje T1), el avance manual de su estado y su corrección (CU-08, RF-039 a RF-042,
EST-Viaje T4, T5 y T7)."""

import uuid
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Destino,
    EstadoAlerta,
    EstadoCotizacion,
    EstadoOportunidad,
    EstadoViaje,
    Moneda,
    Oportunidad,
    TipoAlerta,
    TipoComision,
    Usuario,
    Viaje,
)
from rumbo.datos.repositorios.alertas import RepositorioAlertas
from rumbo.datos.repositorios.destinos import RepositorioDestinos
from rumbo.datos.repositorios.oportunidades import RepositorioCotizaciones, RepositorioOportunidades
from rumbo.datos.repositorios.requisitos import RepositorioRequisitos
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.datos.repositorios.viajes import RepositorioPagos, RepositorioViajes
from rumbo.negocio import calculos
from rumbo.negocio.errores import Conflicto, DatosInvalidos, NoEncontrado
from rumbo.negocio.estados import oportunidad as estado_oportunidad
from rumbo.negocio.estados import viaje as estado_viaje
from rumbo.negocio.politicas import exigir_escritura, visibilidad
from rumbo.negocio.servicios import alertas, economia, parametros

_viajes = RepositorioViajes()
_pagos = RepositorioPagos()
_usuarios = RepositorioUsuarios()
_alertas = RepositorioAlertas()
_oportunidades = RepositorioOportunidades()
_cotizaciones = RepositorioCotizaciones()
_destinos = RepositorioDestinos()
_requisitos = RepositorioRequisitos()

_DESCRIPCION_RESENA = "El viaje terminó: pedile al cliente la reseña de los hoteles."


@dataclass
class FichaViaje:
    """El `Viaje` con lo que la API calcula de su plan de pagos (CU-12)."""

    viaje: Viaje
    saldo_pendiente: Decimal
    porcentaje_pagado: Decimal


async def confirmar_reserva(
    sesion: AsyncSession, actor: Usuario, oportunidad_id: uuid.UUID, datos: dict[str, Any]
) -> FichaViaje:
    """Confirma la reserva de una oportunidad `cotizada` con su cotización aceptada, o `ganada`
    por venta directa (A1), y la deja `ganada` (CU-07, RF-032). En la transacción del pedido crea
    el viaje `reservado` con el cliente de la oportunidad, la moneda de la cotización aceptada (en
    la venta directa, la enviada) y el responsable enviado o el de la oportunidad; guarda su
    economía (CU-10, RN-01) y su plan de pagos con sus alertas (CU-11), y agenda las alertas
    `formulario` de los requisitos activos del destino (RF-034, A2) y la de `salida` (RF-035).
    Si algo falla no queda nada (RNF-05). Una oportunidad que el actor no ve es 404; una ajena
    sin permiso de escritura, 403 (DEC-0005); una que ya derivó en un viaje, 409."""
    oportunidad = await _oportunidades.obtener_para_modificar(
        sesion, oportunidad_id, visibilidad=visibilidad(actor)
    )
    exigir_escritura(actor, oportunidad)
    if await _viajes.existe_de_oportunidad(sesion, oportunidad.id):
        raise Conflicto("La oportunidad ya tiene su viaje: la reserva ya se confirmó.")
    versiones = await _cotizaciones.listar_de_oportunidad(
        sesion, oportunidad.id, visibilidad=visibilidad(actor)
    )
    aceptada = next((c for c in versiones if c.estado is EstadoCotizacion.aceptada), None)
    cerrada_antes = oportunidad.estado is EstadoOportunidad.ganada
    estado_oportunidad.confirmar_reserva(oportunidad, con_cotizacion_aceptada=aceptada is not None)
    moneda = aceptada.moneda if aceptada is not None else _moneda_de_venta_directa(datos)
    destino = await _destino_activo(sesion, actor, datos["destino_id"])
    if datos["fecha_regreso"] < datos["fecha_salida"]:
        raise DatosInvalidos("fecha_regreso", "El regreso no puede ser anterior a la salida.")
    responsable = await _responsable_de_la_reserva(
        sesion, actor, oportunidad, datos.get("responsable_id")
    )

    viaje = Viaje(
        cliente_id=oportunidad.cliente_id,
        oportunidad_id=oportunidad.id,
        destino_id=destino.id,
        responsable_id=responsable.id,
        fecha_salida=datos["fecha_salida"],
        fecha_regreso=datos["fecha_regreso"],
        categoria=datos["categoria"],
        moneda=moneda,
        comision_tipo=TipoComision.porcentaje,  # sin vendedor ni comisión enviada: cero por ciento
    )
    estado_viaje.reservar(viaje)
    await economia.aplicar_economia(sesion, actor, viaje, datos["economia"])
    pagos = datos["plan_de_pagos"]["pagos"]
    economia.exigir_plan_valido(viaje, [], pagos)

    sesion.add(viaje)
    await sesion.flush()
    await economia.agendar_pagos(sesion, viaje, responsable, pagos)
    await _agendar_alertas_de_la_reserva(sesion, actor, viaje, responsable)
    if not cerrada_antes:
        await alertas.resolver_de_origen(sesion, oportunidad)  # al cerrarla ganada (RN-08)
    return await _guardar(sesion, actor, viaje)


def _moneda_de_venta_directa(datos: dict[str, Any]) -> Moneda:
    """Sin cotización aceptada (venta directa, A1), la moneda del viaje viene en el pedido."""
    if datos.get("moneda") is None:
        raise DatosInvalidos("moneda", "En una venta directa indicá la moneda del viaje.")
    return Moneda(datos["moneda"])


async def _destino_activo(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> Destino:
    """El destino tiene que existir y estar activo en el catálogo (DEC-0006, DEC-0009)."""
    try:
        destino = await _destinos.obtener(sesion, destino_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        destino = None
    if destino is None or not destino.activo:
        raise DatosInvalidos("destino_id", "El destino no existe o está de baja.")
    return destino


async def _responsable_de_la_reserva(
    sesion: AsyncSession, actor: Usuario, oportunidad: Oportunidad, responsable_id: uuid.UUID | None
) -> Usuario:
    """El enviado, que tiene que ser un `Usuario` activo; si no, el de la oportunidad, que el
    viaje hereda (DEC-0005)."""
    if responsable_id is None or responsable_id == oportunidad.responsable_id:
        if actor.id == oportunidad.responsable_id:
            return actor
        return await _usuarios.obtener(
            sesion, oportunidad.responsable_id, visibilidad=visibilidad(actor)
        )
    if responsable_id == actor.id:
        return actor
    try:
        responsable = await _usuarios.obtener(
            sesion, responsable_id, visibilidad=visibilidad(actor)
        )
    except NoEncontrado:
        responsable = None
    if responsable is None or not responsable.activo:
        raise DatosInvalidos("responsable_id", "El responsable no existe o está de baja.")
    return responsable


async def _agendar_alertas_de_la_reserva(
    sesion: AsyncSession, actor: Usuario, viaje: Viaje, responsable: Usuario
) -> None:
    """Una alerta `formulario` por requisito activo del destino, con su anticipación (RF-034;
    sin requisitos, ninguna: A2), y la de `salida` con la anticipación configurada (RF-035),
    todas en la agenda del responsable."""
    requisitos = await _requisitos.listar_activos(
        sesion, viaje.destino_id, visibilidad=visibilidad(actor)
    )
    salida = viaje.fecha_salida.strftime("%d/%m/%y")
    for requisito in requisitos:
        await alertas.crear(
            sesion,
            TipoAlerta.formulario,
            viaje.fecha_salida - timedelta(days=requisito.anticipacion_dias),
            f"{requisito.nombre}: tramitarlo antes de la salida del {salida}.",
            responsable,
            viaje,
        )
    configuracion = await parametros.obtener(sesion)
    await alertas.crear(
        sesion,
        TipoAlerta.salida,
        viaje.fecha_salida - timedelta(days=configuracion.anticipacion_salida_dias),
        f"El viaje sale el {salida}.",
        responsable,
        viaje,
    )


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
