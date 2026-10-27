"""Servicio del módulo oportunidades: embudo, detalle, edición y estados (CU-05) y emisión de
cotizaciones (CU-06)."""

import uuid
from collections.abc import Callable
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Cotizacion,
    EstadoOportunidad,
    Moneda,
    MotivoPerdida,
    Oportunidad,
    RolUsuario,
    Usuario,
)
from rumbo.datos.repositorios.oportunidades import RepositorioOportunidades
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.errores import DatosInvalidos, NoEncontrado
from rumbo.negocio.estados import cotizacion as estado_cotizacion
from rumbo.negocio.estados import oportunidad as estado
from rumbo.negocio.politicas import exigir_escritura, exigir_rol, visibilidad
from rumbo.negocio.servicios import parametros
from rumbo.negocio.servicios.alertas import resolver_de_origen

_oportunidades = RepositorioOportunidades()
_usuarios = RepositorioUsuarios()


async def listar_oportunidades(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    estado: EstadoOportunidad | None,
    cliente_id: uuid.UUID | None,
    responsable_id: uuid.UUID | None,
    mios: bool,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Oportunidad], int]:
    """Página del embudo y el total (CU-05, RF-016). `mios` deja las que el actor tiene a cargo
    (y gana sobre `responsable_id`); lo que ve cada rol lo decide `visibilidad`: el `freelance`
    solo lo suyo (RF-151)."""
    return await _oportunidades.paginar(
        sesion,
        estado=estado,
        cliente_id=cliente_id,
        responsable_id=actor.id if mios else responsable_id,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def obtener_oportunidad(
    sesion: AsyncSession, actor: Usuario, oportunidad_id: uuid.UUID
) -> Oportunidad:
    """Una `Oportunidad` (CU-05). Una que el actor no ve es `NoEncontrado` (RF-151)."""
    return await _oportunidades.obtener(sesion, oportunidad_id, visibilidad=visibilidad(actor))


async def editar_oportunidad(
    sesion: AsyncSession, actor: Usuario, oportunidad_id: uuid.UUID, cambios: dict[str, Any]
) -> Oportunidad:
    """Aplica solo los campos enviados a los datos y las notas (CU-05, RF-016). No toca el
    `estado`: eso va por las acciones. Edita el responsable, admin o dueño (DEC-0005); reasignar
    `responsable_id` es solo de admin y dueño, y el nuevo tiene que ser un `Usuario` activo."""
    oportunidad = await _oportunidades.obtener_para_modificar(
        sesion, oportunidad_id, visibilidad=visibilidad(actor)
    )
    exigir_escritura(actor, oportunidad)
    if cambios.get("responsable_id", oportunidad.responsable_id) != oportunidad.responsable_id:
        exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
        await _exigir_responsable_activo(sesion, actor, cambios["responsable_id"])
    desde = cambios.get("fecha_desde_tentativa", oportunidad.fecha_desde_tentativa)
    hasta = cambios.get("fecha_hasta_tentativa", oportunidad.fecha_hasta_tentativa)
    if desde is not None and hasta is not None and hasta < desde:
        campo = (
            "fecha_hasta_tentativa"
            if "fecha_hasta_tentativa" in cambios
            else "fecha_desde_tentativa"
        )
        raise DatosInvalidos(campo, "La fecha hasta no puede ser anterior a la fecha desde.")
    for campo, valor in cambios.items():
        setattr(oportunidad, campo, valor)
    await sesion.flush()
    await sesion.refresh(oportunidad)
    return oportunidad


async def pasar_a_en_gestion(
    sesion: AsyncSession, actor: Usuario, oportunidad_id: uuid.UUID
) -> Oportunidad:
    """El responsable toma una consulta nueva (CU-05, EST-Oportunidad T2)."""
    return await _transicionar(sesion, actor, oportunidad_id, estado.pasar_a_en_gestion)


async def perder_oportunidad(
    sesion: AsyncSession,
    actor: Usuario,
    oportunidad_id: uuid.UUID,
    motivo: MotivoPerdida,
    detalle: str | None,
) -> Oportunidad:
    """Cierra como perdida con su motivo (CU-05 A2, RF-017) y resuelve las alertas automáticas
    que quedaban abiertas (RN-08)."""
    return await _transicionar(
        sesion,
        actor,
        oportunidad_id,
        lambda o: estado.perder(o, motivo, detalle),
        resolver_alertas=True,
    )


async def reactivar_oportunidad(
    sesion: AsyncSession, actor: Usuario, oportunidad_id: uuid.UUID
) -> Oportunidad:
    """Una perdida vuelve a en gestión (CU-05 A3, RF-020)."""
    return await _transicionar(sesion, actor, oportunidad_id, estado.reactivar)


async def ganar_oportunidad(
    sesion: AsyncSession, actor: Usuario, oportunidad_id: uuid.UUID
) -> Oportunidad:
    """Venta directa sin cotización formal: queda ganada, lista para confirmar la reserva
    (CU-05 A4, RF-016); resuelve las alertas automáticas abiertas (RN-08)."""
    return await _transicionar(sesion, actor, oportunidad_id, estado.ganar, resolver_alertas=True)


async def emitir_cotizacion(
    sesion: AsyncSession,
    actor: Usuario,
    oportunidad_id: uuid.UUID,
    moneda: Moneda,
    items: list[dict[str, Any]],
) -> Cotizacion:
    """Emite una cotización, o una nueva versión, en `borrador` con la vigencia configurada (CU-06,
    RF-021, RF-022, RF-024). La oportunidad se bloquea como en `_transicionar`: una que el actor
    no ve es 404, una ajena sin permiso 403 (DEC-0005) y una cerrada 409."""
    oportunidad = await _oportunidades.obtener_para_modificar(
        sesion, oportunidad_id, visibilidad=visibilidad(actor)
    )
    exigir_escritura(actor, oportunidad)
    configuracion = await parametros.obtener(sesion)
    cotizacion = estado_cotizacion.emitir(
        oportunidad,
        moneda=moneda,
        items=items,
        fecha=hoy(),
        vigencia_meses=configuracion.vigencia_cotizacion_meses,
    )
    sesion.add(cotizacion)
    await sesion.flush()
    await sesion.refresh(cotizacion)
    return cotizacion


async def _transicionar(
    sesion: AsyncSession,
    actor: Usuario,
    oportunidad_id: uuid.UUID,
    transicion: Callable[[Oportunidad], None],
    *,
    resolver_alertas: bool = False,
) -> Oportunidad:
    """Aplica una transición de EST-Oportunidad: una que el actor no ve es 404, una ajena sin
    permiso de escritura 403 (DEC-0005) y una inválida 409. Al cerrarla, las alertas pendientes
    de la oportunidad se resuelven salvo las `manual` (RN-08)."""
    oportunidad = await _oportunidades.obtener_para_modificar(
        sesion, oportunidad_id, visibilidad=visibilidad(actor)
    )
    exigir_escritura(actor, oportunidad)
    transicion(oportunidad)
    if resolver_alertas:
        await resolver_de_origen(sesion, oportunidad)
    await sesion.flush()
    await sesion.refresh(oportunidad)
    return oportunidad


async def _exigir_responsable_activo(
    sesion: AsyncSession, actor: Usuario, responsable_id: uuid.UUID
) -> None:
    """El nuevo responsable tiene que ser un `Usuario` activo; si no, 422 sobre ese campo."""
    try:
        responsable = await _usuarios.obtener(
            sesion, responsable_id, visibilidad=visibilidad(actor)
        )
    except NoEncontrado:
        responsable = None
    if responsable is None or not responsable.activo:
        raise DatosInvalidos("responsable_id", "El responsable no existe o está de baja.")
