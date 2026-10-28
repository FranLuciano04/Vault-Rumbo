"""Servicio del módulo oportunidades: registro de consultas (CU-04), embudo, detalle, edición y
estados (CU-05) y emisión de cotizaciones (CU-06)."""

import asyncio
import uuid
from collections.abc import Callable
from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Alerta,
    Cotizacion,
    EstadoOportunidad,
    Moneda,
    MotivoPerdida,
    Oportunidad,
    RolUsuario,
    TipoAlerta,
    Usuario,
)
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.oportunidades import RepositorioCotizaciones, RepositorioOportunidades
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.documentos.cotizacion import pdf_cotizacion
from rumbo.negocio.errores import DatosInvalidos, NoEncontrado
from rumbo.negocio.estados import cotizacion as estado_cotizacion
from rumbo.negocio.estados import oportunidad as estado
from rumbo.negocio.politicas import exigir_escritura, exigir_rol, visibilidad
from rumbo.negocio.servicios import parametros
from rumbo.negocio.servicios.alertas import (
    ContextoDeAlerta,
    crear,
    obtener_alerta,
    resolver_de_origen,
)

_clientes = RepositorioClientes()
_oportunidades = RepositorioOportunidades()
_cotizaciones = RepositorioCotizaciones()
_usuarios = RepositorioUsuarios()


async def registrar_consulta(
    sesion: AsyncSession, actor: Usuario, datos: dict[str, Any]
) -> Oportunidad:
    """Registra una consulta como `Oportunidad` en estado `nueva` (CU-04, RF-010, RF-013). El
    responsable es siempre el actor, lo que envíe el cliente. El `Cliente` tiene que existir y
    ser visible para el actor (RF-151); si no, 422 con el mismo mensaje, para no revelar si existe.
    El aviso de una oportunidad abierta del mismo cliente lo arma el front (RF-012)."""
    try:
        await _clientes.obtener(sesion, datos["cliente_id"], visibilidad=visibilidad(actor))
    except NoEncontrado:
        raise DatosInvalidos("cliente_id", "El cliente no existe.") from None
    oportunidad = Oportunidad(**datos, responsable_id=actor.id)
    sesion.add(oportunidad)
    await sesion.flush()
    await sesion.refresh(oportunidad)
    return oportunidad


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


async def agendar_insistencia(
    sesion: AsyncSession,
    actor: Usuario,
    oportunidad_id: uuid.UUID,
    fecha: date,
    descripcion: str,
) -> tuple[Alerta, ContextoDeAlerta]:
    """Agenda un recontacto en la agenda del responsable (CU-05 A1, RF-015). Reagendar es
    agendar otra: la anterior no se toca (RF-019). Lo agenda el responsable, admin o dueño
    (DEC-0005); la alerta es siempre del responsable."""
    oportunidad = await _oportunidades.obtener_para_modificar(
        sesion, oportunidad_id, visibilidad=visibilidad(actor)
    )
    exigir_escritura(actor, oportunidad)
    estado.exigir_agendable(oportunidad)
    if fecha <= hoy():
        raise DatosInvalidos("fecha", "La insistencia se agenda para una fecha posterior a hoy.")
    # Quien no es dirección solo ve su propio `Usuario` (y escribe solo si es el responsable).
    responsable = (
        actor
        if actor.id == oportunidad.responsable_id
        else await _usuarios.obtener(
            sesion, oportunidad.responsable_id, visibilidad=visibilidad(actor)
        )
    )
    alerta = await crear(
        sesion, TipoAlerta.insistencia, fecha, descripcion, responsable, oportunidad
    )
    return await obtener_alerta(sesion, actor, alerta.id)


async def listar_cotizaciones(
    sesion: AsyncSession,
    actor: Usuario,
    oportunidad_id: uuid.UUID,
    *,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Cotizacion], int]:
    """Página de versiones de la oportunidad, de la más reciente a la más antigua, y el total
    (CU-06, RF-024). Una oportunidad que el actor no ve es `NoEncontrado` (RF-151)."""
    await _oportunidades.obtener(sesion, oportunidad_id, visibilidad=visibilidad(actor))
    return await _cotizaciones.paginar_de_oportunidad(
        sesion,
        oportunidad_id,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


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


async def documento_cotizacion(
    sesion: AsyncSession, actor: Usuario, cotizacion_id: uuid.UUID
) -> bytes:
    """PDF de la cotización para enviar al cliente (CU-06, RF-021). Una que el actor no ve es
    `NoEncontrado` (RF-151); el `Cliente` sale de su oportunidad, ya visible para el actor."""
    cotizacion = await _cotizaciones.obtener(sesion, cotizacion_id, visibilidad=visibilidad(actor))
    oportunidad = await _oportunidades.obtener(
        sesion, cotizacion.oportunidad_id, visibilidad=visibilidad(actor)
    )
    # WeasyPrint es síncrono y pesado: fuera del bucle de eventos.
    return await asyncio.to_thread(pdf_cotizacion, cotizacion, oportunidad.cliente)


async def marcar_cotizacion_enviada(
    sesion: AsyncSession, actor: Usuario, cotizacion_id: uuid.UUID
) -> Cotizacion:
    """Registra que la cotización se envió por fuera del sistema; la oportunidad pasa a `cotizada`
    (CU-06 paso 4, RF-023)."""
    return await _transicionar_cotizacion(sesion, actor, cotizacion_id, estado_cotizacion.enviar)


async def aceptar_cotizacion(
    sesion: AsyncSession, actor: Usuario, cotizacion_id: uuid.UUID
) -> Cotizacion:
    """Registra que el cliente aceptó (CU-06 A2, RF-025); queda lista para confirmar la reserva."""
    return await _transicionar_cotizacion(
        sesion, actor, cotizacion_id, lambda c, o: estado_cotizacion.aceptar(c, o, hoy=hoy())
    )


async def rechazar_cotizacion(
    sesion: AsyncSession, actor: Usuario, cotizacion_id: uuid.UUID
) -> Cotizacion:
    """Registra que el cliente no aceptó (CU-06 A3, RF-025); la oportunidad no cambia."""
    return await _transicionar_cotizacion(sesion, actor, cotizacion_id, estado_cotizacion.rechazar)


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


async def _transicionar_cotizacion(
    sesion: AsyncSession,
    actor: Usuario,
    cotizacion_id: uuid.UUID,
    transicion: Callable[[Cotizacion, Oportunidad], None],
) -> Cotizacion:
    """Aplica una transición de EST-Cotización con los permisos de su oportunidad: una que el
    actor no ve es 404, una ajena sin permiso de escritura 403 (DEC-0005) y una inválida 409.
    Bloquea primero la oportunidad, como `emitir_cotizacion`, y después relee la cotización."""
    cotizacion = await _cotizaciones.obtener(sesion, cotizacion_id, visibilidad=visibilidad(actor))
    oportunidad = await _oportunidades.obtener_para_modificar(
        sesion, cotizacion.oportunidad_id, visibilidad=visibilidad(actor)
    )
    exigir_escritura(actor, oportunidad)
    # La primera lectura, sin bloqueo, da el 404 y la oportunidad a bloquear; esta, bloqueada y
    # releída, es la que decide la transición.
    cotizacion = await _cotizaciones.obtener_para_modificar(
        sesion, cotizacion_id, visibilidad=visibilidad(actor)
    )
    transicion(cotizacion, oportunidad)
    await sesion.flush()
    await sesion.refresh(cotizacion)
    return cotizacion


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
