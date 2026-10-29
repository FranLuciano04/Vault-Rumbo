"""Servicio del módulo economía: registro de la economía del viaje (CU-10, RN-01, DEC-0007)."""

import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import TipoComision, Usuario, Viaje
from rumbo.datos.repositorios.operadores import RepositorioOperadores
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.datos.repositorios.viajes import RepositorioPagos, RepositorioViajes
from rumbo.negocio import calculos
from rumbo.negocio.errores import DatosInvalidos, NoEncontrado
from rumbo.negocio.politicas import exigir_escritura, visibilidad

GANANCIA_NEGATIVA = "ganancia_negativa"
MARGEN_NEGATIVO = "margen_negativo"
PLAN_DESBALANCEADO = "plan_desbalanceado"

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
    operador_id = datos.get("operador_id")
    if operador_id is not None:
        await _exigir_operador(sesion, actor, operador_id)
    vendedor = await _vendedor(sesion, actor, datos.get("vendedor_id"))

    viaje.precio_venta = datos["precio_venta"]
    viaje.costo = datos["costo"]
    viaje.operador_id = operador_id
    viaje.vendedor_id = vendedor.id if vendedor else None
    viaje.comision_tipo, viaje.comision_vendedor = _comision(
        vendedor, datos.get("comision_tipo"), datos.get("comision_vendedor"), viaje.comision_tipo
    )
    await sesion.flush()
    await sesion.refresh(viaje)  # ganancia y margen son columnas generadas

    pagos = await _pagos.listar_de_viaje(sesion, viaje.id, visibilidad=visibilidad(actor))
    advertencias = []
    if viaje.ganancia is not None and viaje.ganancia < 0:
        advertencias.append(GANANCIA_NEGATIVA)
    if viaje.margen is not None and viaje.margen < 0:
        advertencias.append(MARGEN_NEGATIVO)
    if calculos.plan_desbalanceado(viaje.precio_venta, pagos):
        advertencias.append(PLAN_DESBALANCEADO)
    return ResultadoEconomia(
        viaje=viaje,
        saldo_pendiente=calculos.saldo_pendiente(pagos),
        porcentaje_pagado=calculos.porcentaje_pagado(viaje.precio_venta, pagos),
        advertencias=advertencias,
    )


async def _exigir_operador(sesion: AsyncSession, actor: Usuario, operador_id: uuid.UUID) -> None:
    try:
        await _operadores.obtener(sesion, operador_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        raise DatosInvalidos("operador_id", "El operador no existe.") from None


async def _vendedor(
    sesion: AsyncSession, actor: Usuario, vendedor_id: uuid.UUID | None
) -> Usuario | None:
    """El vendedor elegido. El actor puede elegirse a sí mismo aunque no vea a los demás
    usuarios (el freelance); otro tiene que existir, ser visible y estar activo."""
    if vendedor_id is None:
        return None
    if vendedor_id == actor.id:
        return actor
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
    sobre la ganancia y no supera 100."""
    elegido = TipoComision(tipo) if tipo is not None else None
    if vendedor is None:
        return elegido or tipo_actual, Decimal("0.00")
    if valor is None:
        if (
            vendedor.comision_default_tipo is not None
            and vendedor.comision_default_valor is not None
        ):
            return vendedor.comision_default_tipo, vendedor.comision_default_valor
        return elegido or tipo_actual, Decimal("0.00")
    final = elegido or vendedor.comision_default_tipo or tipo_actual
    if final is TipoComision.porcentaje and valor > 100:
        raise DatosInvalidos("comision_vendedor", "Un porcentaje de comisión no puede superar 100.")
    return final, valor
