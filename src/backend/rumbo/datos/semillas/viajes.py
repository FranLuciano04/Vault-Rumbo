"""Semilla de demo de M6 (T-108): viajes ficticios en distintos estados, con su economía y sus pagos."""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    CategoriaViaje,
    Destino,
    EstadoPago,
    FormaPago,
    Moneda,
    Pago,
    TipoComision,
    TipoPago,
    Viaje,
)
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import normalizar
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.estados import viaje as estado_viaje

_clientes = RepositorioClientes()
_usuarios = RepositorioUsuarios()

_PRECIO = Decimal("1000000.00")
_COSTO = Decimal("700000.00")

# (contacto del cliente, destino, días hasta la salida, días de duración, estado final, pagos
# como (tipo, monto, días hasta el vencimiento, cobrado)). El estado se alcanza con las mismas
# transiciones del negocio: el primer cobro vende, saldar confirma, y de ahí en más se inicia,
# se finaliza o se cancela. Los pagos de cada viaje suman el precio de venta.
_VIAJES = [
    (
        "familia.perez@rumbo.test",
        "Cancún",
        100,
        8,
        "reservado",
        [(TipoPago.sena, "300000.00", 10, False), (TipoPago.saldo, "700000.00", 60, False)],
    ),
    (
        "+54 9 11 5555-0101",
        "Bariloche",
        70,
        6,
        "vendido",
        [(TipoPago.sena, "300000.00", -5, True), (TipoPago.saldo, "700000.00", 40, False)],
    ),
    (
        "lucia.gomez@rumbo.test",
        "Nueva York",
        40,
        10,
        "confirmado",
        [(TipoPago.sena, "400000.00", -30, True), (TipoPago.saldo, "600000.00", -10, True)],
    ),
    (
        "+54 9 11 5555-0102",
        "Cancún",
        -2,
        9,
        "en_curso",
        [(TipoPago.sena, "400000.00", -60, True), (TipoPago.saldo, "600000.00", -20, True)],
    ),
    (
        "familia.perez@rumbo.test",
        "Bariloche",
        -30,
        7,
        "finalizado",
        [(TipoPago.sena, "500000.00", -90, True), (TipoPago.saldo, "500000.00", -45, True)],
    ),
    (
        "+54 9 11 5555-0101",
        "Nueva York",
        50,
        12,
        "cancelado",
        [(TipoPago.sena, "300000.00", -20, True), (TipoPago.saldo, "700000.00", 20, False)],
    ),
]


# Se busca por cliente, destino y fecha de salida: un viaje ya cargado, aunque la agencia lo haya
# movido de estado, no se vuelve a crear ni se pisa.
async def sembrar_viajes(sesion: AsyncSession) -> None:
    """Carga los viajes de demo, idempotente. Corre después de la configuración, de la que toma
    los destinos y el responsable de demo, y de la de clientes, de la que toma los clientes.
    Responde el asesor del cliente o, si no tiene, la empleada de demo. Las fechas son relativas
    al día en que corre."""
    empleada = await _usuarios.buscar_por_email(sesion, "empleada.demo@rumbo.test")
    dia = hoy()
    for contacto, nombre_destino, dias, duracion, estado, pagos in _VIAJES:
        cliente = await _clientes.buscar_por_contacto(sesion, contacto=contacto, asesor_id=None)
        destino = await sesion.scalar(
            select(Destino).where(nombre_normalizado(Destino.nombre) == normalizar(nombre_destino))
        )
        responsable_id = (cliente.asesor_asignado_id if cliente else None) or (
            empleada.id if empleada else None
        )
        if cliente is None or destino is None or responsable_id is None:
            continue
        salida = dia + timedelta(days=dias)
        existente = await sesion.scalar(
            select(Viaje.id).where(
                Viaje.cliente_id == cliente.id,
                Viaje.destino_id == destino.id,
                Viaje.fecha_salida == salida,
            )
        )
        if existente is not None:
            continue
        viaje = Viaje(
            cliente_id=cliente.id,
            destino_id=destino.id,
            responsable_id=responsable_id,
            fecha_salida=salida,
            fecha_regreso=salida + timedelta(days=duracion),
            categoria=CategoriaViaje.individual,
            moneda=Moneda.ARS,
            precio_venta=_PRECIO,
            costo=_COSTO,
            comision_tipo=TipoComision.porcentaje,
            comision_vendedor=Decimal("0.00"),
        )
        estado_viaje.reservar(viaje)
        sesion.add(viaje)
        await sesion.flush()
        for tipo, monto, vence, cobrado in pagos:
            pago = Pago(
                viaje_id=viaje.id,
                tipo=tipo,
                monto=Decimal(monto),
                vencimiento=dia + timedelta(days=vence),
                estado=EstadoPago.pagado if cobrado else EstadoPago.pendiente,
            )
            if cobrado:
                pago.forma_pago = FormaPago.transferencia
                pago.moneda_pago = Moneda.ARS
                pago.monto_cobrado = Decimal(monto)
                pago.fecha_cobro = min(dia, dia + timedelta(days=vence))
            sesion.add(pago)
        await sesion.flush()
        _llevar_al_estado(viaje, estado, pagos)
        await sesion.flush()


def _llevar_al_estado(viaje: Viaje, estado: str, pagos: list[tuple[TipoPago, str, int, bool]]) -> None:
    """Aplica las transiciones del negocio hasta el estado pedido (EST-Viaje)."""
    if estado == "reservado":
        return
    cobrado = sum((Decimal(m) for _, m, _, c in pagos if c), Decimal("0"))
    saldo = _PRECIO - cobrado
    estado_viaje.al_registrar_cobro(viaje, saldo=saldo)
    if estado == "en_curso":
        estado_viaje.iniciar(viaje)
    elif estado == "finalizado":
        estado_viaje.iniciar(viaje)
        estado_viaje.finalizar(viaje)
    elif estado == "cancelado":
        estado_viaje.cancelar(viaje, motivo="Cancelado por el cliente (demo)", fecha=hoy())
