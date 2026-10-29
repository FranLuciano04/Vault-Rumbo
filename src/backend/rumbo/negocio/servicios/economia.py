"""Servicio del módulo economía: registro de la economía del viaje y su plan de pagos (CU-10,
CU-11, RN-01, DEC-0007)."""

import uuid
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import sumar_meses
from rumbo.datos.modelos import (
    EstadoPago,
    EstadoViaje,
    Pago,
    RolUsuario,
    TipoAlerta,
    TipoComision,
    TipoPago,
    Usuario,
    Viaje,
)
from rumbo.datos.repositorios.operadores import RepositorioOperadores
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.datos.repositorios.viajes import RepositorioPagos, RepositorioViajes
from rumbo.negocio import calculos
from rumbo.negocio.errores import Conflicto, DatosInvalidos, NoEncontrado
from rumbo.negocio.estados import pago as estado_pago
from rumbo.negocio.politicas import exigir_escritura, visibilidad
from rumbo.negocio.servicios import alertas

GANANCIA_NEGATIVA = "ganancia_negativa"
MARGEN_NEGATIVO = "margen_negativo"
PLAN_DESBALANCEADO = "plan_desbalanceado"

# Un viaje cancelado o finalizado ya no admite cambios en su economía; en curso, sí.
_CERRADOS = (EstadoViaje.cancelado, EstadoViaje.finalizado)

# Cómo nombra la alerta `pago` a cada tipo de pago (CU-11).
_NOMBRE_DEL_PAGO = {
    TipoPago.sena: "La seña",
    TipoPago.cuota: "Una cuota",
    TipoPago.saldo: "El saldo",
}

_viajes = RepositorioViajes()
_pagos = RepositorioPagos()
_operadores = RepositorioOperadores()
_usuarios = RepositorioUsuarios()


@dataclass
class ResultadoEconomia:
    """El `Viaje` con su economía guardada, lo que la API calcula de su plan y las advertencias
    que no impiden guardar (CU-10 A3 y A4)."""

    viaje: Viaje
    saldo_pendiente: Decimal
    porcentaje_pagado: Decimal
    advertencias: list[str] = field(default_factory=list)


async def registrar_economia(
    sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID, datos: dict[str, Any]
) -> ResultadoEconomia:
    """Guarda precio de venta, costo, operador, vendedor y comisión del viaje (CU-10, RF-055 a
    RF-059). Ganancia y margen los calcula la base. Sin comisión enviada, toma la del vendedor
    (RN-01); sin vendedor, la comisión es cero (A2). Ganancia o margen negativos (A3) y un plan
    de pagos que ya no suma el precio (A4) se guardan igual y vuelven como advertencias: los
    pagos se rebalancean aparte (CU-11). Escribe el responsable, admin o dueño (DEC-0005)."""
    viaje = await _viajes.obtener_para_modificar(sesion, viaje_id, visibilidad=visibilidad(actor))
    exigir_escritura(actor, viaje)
    if viaje.estado in _CERRADOS:
        raise Conflicto(f"No se edita la economía de un viaje {viaje.estado.value}.")
    operador_id = datos.get("operador_id")
    if operador_id is not None and operador_id != viaje.operador_id:
        await _exigir_operador(sesion, actor, operador_id)
    vendedor = await _vendedor(sesion, actor, datos.get("vendedor_id"), viaje.vendedor_id)

    viaje.precio_venta = datos["precio_venta"]
    viaje.costo = datos["costo"]
    viaje.operador_id = operador_id
    viaje.vendedor_id = vendedor.id if vendedor else None
    # el freelance no fija su propia comisión: se aplica el default del vendedor (RN-01)
    tipo, valor = (
        (None, None)
        if actor.rol is RolUsuario.freelance
        else (datos.get("comision_tipo"), datos.get("comision_vendedor"))
    )
    viaje.comision_tipo, viaje.comision_vendedor = _comision(
        vendedor, tipo, valor, viaje.comision_tipo
    )
    await sesion.flush()
    await sesion.refresh(viaje)  # ganancia y margen son columnas generadas

    pagos = await _pagos.listar_de_viaje(sesion, viaje.id, visibilidad=visibilidad(actor))
    return ResultadoEconomia(
        viaje=viaje,
        saldo_pendiente=calculos.saldo_pendiente(pagos),
        porcentaje_pagado=calculos.porcentaje_pagado(viaje.precio_venta, pagos),
        advertencias=_advertencias(viaje, pagos),
    )


async def listar_pagos(sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID) -> list[Pago]:
    """El plan de pagos del viaje, cobrados incluidos y sin los anulados, por vencimiento: el
    checklist de cobros (CU-11, CU-12). Un viaje que el actor no ve es `NoEncontrado`."""
    viaje = await _viajes.obtener(sesion, viaje_id, visibilidad=visibilidad(actor))
    return await _plan(sesion, actor, viaje)


async def definir_plan_de_pagos(
    sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID, items: list[dict[str, Any]]
) -> list[Pago]:
    """Define o rebalancea el plan de pagos del viaje (CU-11, RF-059 a RF-064). Los pagos no
    cobrados se anulan y cierran su alerta; los cobrados quedan como están (A5). Los nuevos
    nacen `pendiente`, cada uno con su alerta `pago` en la agenda del responsable, un mes antes
    del vencimiento. Cobrados más nuevos tienen que sumar el precio de venta (A1); un solo pago
    es válido (A2). Escribe el responsable, admin o dueño (DEC-0005)."""
    viaje = await _viajes.obtener_para_modificar(sesion, viaje_id, visibilidad=visibilidad(actor))
    exigir_escritura(actor, viaje)
    if viaje.estado in _CERRADOS:
        raise Conflicto(f"No se define el plan de pagos de un viaje {viaje.estado.value}.")
    actuales = await _plan(sesion, actor, viaje)
    cobrados = [p for p in actuales if p.estado is EstadoPago.pagado]
    reemplazados = [p for p in actuales if p.estado is not EstadoPago.pagado]
    _exigir_montos_positivos(items)
    _exigir_que_sume_el_precio(viaje, cobrados, items)

    for reemplazado in reemplazados:
        estado_pago.anular(reemplazado)
        await alertas.resolver_de_origen(sesion, reemplazado, (TipoAlerta.pago,))
    responsable = (
        actor
        if actor.id == viaje.responsable_id
        else await _usuarios.obtener(sesion, viaje.responsable_id, visibilidad=visibilidad(actor))
    )
    for item in items:
        pago = Pago(viaje_id=viaje.id, estado=EstadoPago.pendiente, **item)
        sesion.add(pago)
        await alertas.crear(
            sesion,
            TipoAlerta.pago,
            sumar_meses(pago.vencimiento, -1),
            _descripcion_alerta(pago.tipo, pago.vencimiento),
            responsable,
            pago,
        )
    return await _plan(sesion, actor, viaje)


async def _plan(sesion: AsyncSession, actor: Usuario, viaje: Viaje) -> list[Pago]:
    pagos = await _pagos.listar_de_viaje(sesion, viaje.id, visibilidad=visibilidad(actor))
    return [p for p in pagos if p.estado is not EstadoPago.anulado]


def _exigir_montos_positivos(items: list[dict[str, Any]]) -> None:
    """Cada pago es por un monto mayor a cero: el esquema admite cero para todo `Importe`, pero
    un pago de cero violaría `monto > 0` en la base."""
    if any(i["monto"] <= 0 for i in items):
        raise DatosInvalidos("pagos", "Cada pago del plan tiene que ser por un monto mayor a cero.")


def _exigir_que_sume_el_precio(
    viaje: Viaje, cobrados: list[Pago], items: list[dict[str, Any]]
) -> None:
    """Cobrados más nuevos suman el precio de venta (CU-11 A1)."""
    total = sum((p.monto for p in cobrados), Decimal(0)) + sum(
        (i["monto"] for i in items), Decimal(0)
    )
    if total != viaje.precio_venta:
        raise DatosInvalidos(
            "pagos",
            f"El plan suma {total} y el precio de venta es {viaje.precio_venta} "
            f"(diferencia: {total - viaje.precio_venta}).",
        )


def _descripcion_alerta(tipo: TipoPago, vencimiento: date) -> str:
    return f"{_NOMBRE_DEL_PAGO[tipo]} del viaje vence el {vencimiento.strftime('%d/%m/%y')}."


def _advertencias(viaje: Viaje, pagos: list[Pago]) -> list[str]:
    """Lo que conviene revisar y no impide guardar: ganancia o margen negativos (A3) y un plan
    de pagos que ya no suma el precio de venta (A4)."""
    advertencias = []
    if viaje.ganancia is not None and viaje.ganancia < 0:
        advertencias.append(GANANCIA_NEGATIVA)
    if viaje.margen is not None and viaje.margen < 0:
        advertencias.append(MARGEN_NEGATIVO)
    if calculos.plan_desbalanceado(viaje.precio_venta, pagos):
        advertencias.append(PLAN_DESBALANCEADO)
    return advertencias


async def _exigir_operador(sesion: AsyncSession, actor: Usuario, operador_id: uuid.UUID) -> None:
    """El operador tiene que existir y estar activo en el catálogo (DEC-0009)."""
    try:
        operador = await _operadores.obtener(sesion, operador_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        operador = None
    if operador is None or not operador.activo:
        raise DatosInvalidos("operador_id", "El operador no existe o está de baja.")


async def _vendedor(
    sesion: AsyncSession, actor: Usuario, vendedor_id: uuid.UUID | None, actual_id: uuid.UUID | None
) -> Usuario | None:
    """El vendedor elegido. El actor puede elegirse a sí mismo aunque no vea a los demás
    usuarios (el freelance); el que el viaje ya tiene se conserva aunque esté de baja (su id
    viene de un viaje visible); otro tiene que existir, ser visible y estar activo."""
    if vendedor_id is None:
        return None
    if vendedor_id == actor.id:
        return actor
    if vendedor_id == actual_id:
        return await sesion.get_one(Usuario, vendedor_id)
    try:
        vendedor = await _usuarios.obtener(sesion, vendedor_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        vendedor = None
    if vendedor is None or not vendedor.activo:
        raise DatosInvalidos("vendedor_id", "El vendedor no existe o está de baja.")
    return vendedor


def _comision(
    vendedor: Usuario | None,
    tipo: TipoComision | str | None,
    valor: Decimal | None,
    tipo_actual: TipoComision,
) -> tuple[TipoComision, Decimal]:
    """Tipo y valor de la comisión del viaje (RN-01, DEC-0007): sin vendedor, cero (A2); sin
    valor enviado, el default del vendedor; si no, el enviado (override, A1). El porcentaje es
    sobre la ganancia y no supera 100; un tipo sin valor es inválido."""
    elegido = TipoComision(tipo) if tipo is not None else None
    if vendedor is None:
        return elegido or tipo_actual, Decimal("0.00")
    if valor is None:
        if elegido is not None:
            raise DatosInvalidos("comision_vendedor", "Indicá el valor de la comisión.")
        if (
            vendedor.comision_default_tipo is not None
            and vendedor.comision_default_valor is not None
        ):
            return vendedor.comision_default_tipo, vendedor.comision_default_valor
        return tipo_actual, Decimal("0.00")
    final = elegido or vendedor.comision_default_tipo or tipo_actual
    if final is TipoComision.porcentaje and valor > 100:
        raise DatosInvalidos("comision_vendedor", "Un porcentaje de comisión no puede superar 100.")
    return final, valor
