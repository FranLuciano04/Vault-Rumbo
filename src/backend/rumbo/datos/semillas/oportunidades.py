"""Semilla de demo de M4 (T-074): oportunidades y cotizaciones ficticias."""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    CanalOportunidad,
    EstadoOportunidad,
    Moneda,
    MotivoPerdida,
    Oportunidad,
)
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.oportunidades import RepositorioOportunidades
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.estados import cotizacion as estado_cotizacion
from rumbo.negocio.estados import oportunidad as estado_oportunidad
from rumbo.negocio.servicios import parametros

_clientes = RepositorioClientes()
_oportunidades = RepositorioOportunidades()
_usuarios = RepositorioUsuarios()

# (contacto del cliente, destino, canal, pasajeros, días hasta la salida tentativa, estado final,
# ítems de la cotización o None). Con ítems se emite una cotización y se envía; sin ítems no hay
# cotización. La `ganada` es una venta directa (CU-05 A4, sin cotización) y la `perdida` lleva el
# motivo `precio`.
_OPORTUNIDADES = [
    (
        "familia.perez@rumbo.test",
        "Punta Cana, República Dominicana",
        CanalOportunidad.whatsapp,
        4,
        120,
        EstadoOportunidad.cotizada,
        [
            ("Aéreo ida y vuelta", "2400000.00"),
            ("Alojamiento all inclusive 7 noches", "3100000.00"),
        ],
    ),
    (
        "+54 9 11 5555-0101",
        "El Chaltén, Santa Cruz",
        CanalOportunidad.instagram,
        6,
        90,
        EstadoOportunidad.en_gestion,
        None,
    ),
    (
        "lucia.gomez@rumbo.test",
        "Cusco, Perú",
        CanalOportunidad.presencial,
        1,
        60,
        EstadoOportunidad.nueva,
        None,
    ),
    (
        "+54 9 11 5555-0102",
        "Cancún, México",
        CanalOportunidad.instagram,
        2,
        150,
        EstadoOportunidad.ganada,
        None,
    ),
    (
        "familia.perez@rumbo.test",
        "Bariloche, Río Negro",
        CanalOportunidad.whatsapp,
        4,
        30,
        EstadoOportunidad.perdida,
        None,
    ),
]


# Se busca por cliente y destino: una oportunidad ya cargada, aunque la agencia la haya movido de
# estado, no se vuelve a crear ni se pisa. Como la clave incluye el destino, editable por PATCH,
# si la agencia lo cambia la semilla vuelve a crearla (el mismo riesgo que acepta la de clientes).
async def sembrar_oportunidades(sesion: AsyncSession) -> None:
    """Carga las oportunidades de demo, idempotente, llevándolas a su estado con las mismas
    transiciones del negocio. Corre después de la de clientes, de la que toma los clientes, y de
    la configuración, de la que toma los responsables. Responde el asesor del cliente o, si no
    tiene, la empleada de demo. Las fechas son relativas al día en que corre."""
    vigencia_meses = (await parametros.obtener(sesion)).vigencia_cotizacion_meses
    empleada = await _usuarios.buscar_por_email(sesion, "empleada.demo@rumbo.test")
    for contacto, destino, canal, pasajeros, dias, estado, items in _OPORTUNIDADES:
        cliente = await _clientes.buscar_por_contacto(sesion, contacto=contacto, asesor_id=None)
        if cliente is None:
            continue
        if await _oportunidades.existe_de_cliente(
            sesion, cliente_id=cliente.id, destino_consultado=destino
        ):
            continue
        responsable_id = cliente.asesor_asignado_id or (empleada.id if empleada else None)
        if responsable_id is None:
            continue
        salida = hoy() + timedelta(days=dias)
        oportunidad = Oportunidad(
            cliente_id=cliente.id,
            responsable_id=responsable_id,
            canal=canal,
            destino_consultado=destino,
            fecha_desde_tentativa=salida,
            fecha_hasta_tentativa=salida + timedelta(days=7),
            pasajeros=pasajeros,
            estado=EstadoOportunidad.nueva,
        )
        sesion.add(oportunidad)
        await sesion.flush()
        if estado is not EstadoOportunidad.nueva:
            estado_oportunidad.pasar_a_en_gestion(oportunidad)
        if items:
            cotizacion = estado_cotizacion.emitir(
                oportunidad,
                moneda=Moneda.ARS,
                items=[{"concepto": c, "precio": Decimal(p)} for c, p in items],
                fecha=hoy(),
                vigencia_meses=vigencia_meses,
            )
            sesion.add(cotizacion)
            estado_cotizacion.enviar(cotizacion, oportunidad)
        if estado is EstadoOportunidad.ganada:
            estado_oportunidad.ganar(oportunidad)
        elif estado is EstadoOportunidad.perdida:
            estado_oportunidad.perder(oportunidad, MotivoPerdida.precio)
        await sesion.flush()
