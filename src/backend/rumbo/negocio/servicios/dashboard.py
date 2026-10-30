"""Servicio del dashboard: embudo e indicadores del período, calculados en vivo (CU-21, RF-123 a
RF-129)."""

import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import DatosInvalidos
from rumbo.core.fechas import hoy, limites_del_dia, sumar_meses
from rumbo.datos.modelos import EstadoOportunidad, EstadoViaje, Moneda, RolUsuario, Usuario
from rumbo.datos.repositorios.dashboard import (
    DestinoDelPeriodo,
    RepositorioDashboard,
    VencimientoDelPeriodo,
    VentaDelPeriodo,
    ViajeDelPeriodo,
)
from rumbo.negocio.calculos import comision_del_vendedor
from rumbo.negocio.politicas import es_direccion, visibilidad

_dashboard = RepositorioDashboard()

_FRACCION = Decimal("0.0001")
_CENTAVO = Decimal("0.01")
VENTANA_AGENDA = 7  # días hacia adelante de los vencimientos y los viajes próximos
TOP_DESTINOS = 5
MESES_COMPARADOS = 6  # el mes de `hasta` y los anteriores

Totales = dict[Moneda, Decimal]


def _totales() -> Totales:
    return defaultdict(Decimal)


@dataclass
class VentasDeVendedor:
    vendedor_id: uuid.UUID
    vendedor_nombre: str
    viajes: int = 0
    ventas: Totales = field(default_factory=_totales)
    comisiones: Totales = field(default_factory=_totales)


@dataclass(frozen=True)
class IndicadoresEconomicos:
    """Embudo, importes por moneda (las monedas sin movimiento no figuran), agenda, contadores
    y ranking. `filtro_responsable` es la persona que la dirección pidió ver, si pidió alguna."""

    etapas: dict[EstadoOportunidad, int]
    tasa_conversion: Decimal
    ventas: Totales
    ventas_mensuales: list[tuple[date, Totales]]
    ganancia_estimada: Totales
    margen: Totales
    comisiones: Totales
    ticket_promedio: Totales
    cobrado: Totales
    pendiente_de_cobrar: Totales
    pendiente_de_pagar: Totales
    proximos_vencimientos: list[VencimientoDelPeriodo]
    viajes_proximos: list[ViajeDelPeriodo]
    consultas_pendientes: int
    presupuestos_abiertos: int
    reservas_confirmadas: int
    viajes_activos: int
    alertas_pendientes: int
    destinos_mas_vendidos: list[DestinoDelPeriodo]
    ventas_por_vendedor: list[VentasDeVendedor]
    filtro_responsable: uuid.UUID | None


async def calcular_indicadores(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    desde: date,
    hasta: date,
    responsable_id: uuid.UUID | None,
) -> IndicadoresEconomicos:
    """Indicadores del período `[desde, hasta]`, inclusive; `desde > hasta` es un dato inválido.
    Admin y dueño ven toda la agencia y filtran por `responsable_id`; el resto ve solo lo suyo e
    ignora ese filtro (RF-129): el empleado queda acotado a lo que lleva y el freelance ve su
    visibilidad de DEC-0008. Las `comisiones` van al vendedor del viaje (o a su responsable si no
    tiene vendedor) y, con filtro o en la vista propia, suman las de esa persona (DEC-0024).
    Los saldos pendientes, los contadores y la agenda son la foto de hoy, sin acotar al período."""
    if desde > hasta:
        raise DatosInvalidos("hasta", "La fecha final no puede ser anterior a la inicial.")
    # Quién cobra comisión: la persona filtrada (dirección) o el propio actor (DEC-0024 §6).
    vendedor_id = responsable_id if es_direccion(actor) else actor.id
    filtro_responsable = responsable_id if es_direccion(actor) else None
    if actor.rol is RolUsuario.empleado:
        responsable_id = actor.id
    elif actor.rol is RolUsuario.freelance:
        responsable_id = None  # ve lo de sus clientes y lo que lleva, por visibilidad (DEC-0008)
    vista = visibilidad(actor)
    inicio, fin = limites_del_dia(desde)[0], limites_del_dia(hasta)[1]
    oportunidades = await _dashboard.oportunidades_por_estado(
        sesion, desde=inicio, hasta=fin, responsable_id=responsable_id, visibilidad=vista
    )
    viajes = await _dashboard.ventas(
        sesion, desde=inicio, hasta=fin, responsable_id=responsable_id, visibilidad=vista
    )
    vendidos = (
        viajes
        if vendedor_id is None
        else await _dashboard.ventas(
            sesion,
            desde=inicio,
            hasta=fin,
            responsable_id=None,
            vendedor_id=vendedor_id,
            visibilidad=vista,
        )
    )
    cobrado = await _dashboard.cobrado(
        sesion, desde=desde, hasta=hasta, responsable_id=responsable_id, visibilidad=vista
    )
    pendiente = await _dashboard.pendiente_de_cobrar(
        sesion, responsable_id=responsable_id, visibilidad=vista
    )
    por_pagar = await _dashboard.pendiente_de_pagar(
        sesion, responsable_id=responsable_id, visibilidad=vista
    )
    hoy_mismo = hoy()
    hasta_agenda = hoy_mismo + timedelta(days=VENTANA_AGENDA)
    vencimientos = await _dashboard.vencimientos_proximos(
        sesion,
        desde=hoy_mismo,
        hasta=hasta_agenda,
        responsable_id=responsable_id,
        visibilidad=vista,
    )
    salidas = await _dashboard.viajes_proximos(
        sesion,
        desde=hoy_mismo,
        hasta=hasta_agenda,
        responsable_id=responsable_id,
        visibilidad=vista,
    )
    abiertas = await _dashboard.oportunidades_por_estado(
        sesion, responsable_id=responsable_id, visibilidad=vista
    )
    por_estado = await _dashboard.viajes_por_estado(
        sesion, responsable_id=responsable_id, visibilidad=vista
    )
    alertas = await _dashboard.alertas_pendientes(
        sesion, responsable_id=responsable_id, visibilidad=vista
    )
    destinos = await _dashboard.destinos_mas_vendidos(
        sesion,
        desde=inicio,
        hasta=fin,
        responsable_id=responsable_id,
        limite=TOP_DESTINOS,
        visibilidad=vista,
    )
    meses = [sumar_meses(hasta.replace(day=1), -i) for i in range(MESES_COMPARADOS - 1, -1, -1)]
    por_mes = await _dashboard.ventas_por_mes(
        sesion,
        desde=limites_del_dia(meses[0])[0],
        hasta=limites_del_dia(sumar_meses(meses[-1], 1))[0],
        responsable_id=responsable_id,
        visibilidad=vista,
    )

    ventas = _totales()
    cantidad: dict[Moneda, int] = defaultdict(int)
    ganancia = _totales()
    comisiones = _totales()
    for v in viajes:
        ventas[v.moneda] += v.precio_venta
        cantidad[v.moneda] += 1
        ganancia[v.moneda] += v.ganancia
    for v in vendidos:
        comisiones[v.moneda] += _comision(v)
    margen = {
        moneda: (ganancia[moneda] / total).quantize(_FRACCION, rounding=ROUND_HALF_UP)
        for moneda, total in ventas.items()
        if total > 0
    }
    return IndicadoresEconomicos(
        etapas={e: oportunidades.get(e, 0) for e in EstadoOportunidad},
        tasa_conversion=_tasa_de_conversion(oportunidades),
        ventas=ventas,
        ventas_mensuales=[
            (mes, {moneda: total for (dia, moneda), total in por_mes.items() if dia == mes})
            for mes in meses
        ],
        ganancia_estimada=ganancia,
        margen=margen,
        comisiones=comisiones,
        ticket_promedio={
            moneda: (total / cantidad[moneda]).quantize(_CENTAVO, rounding=ROUND_HALF_UP)
            for moneda, total in ventas.items()
        },
        cobrado=cobrado,
        pendiente_de_cobrar=pendiente,
        pendiente_de_pagar=por_pagar,
        proximos_vencimientos=vencimientos,
        viajes_proximos=salidas,
        consultas_pendientes=abiertas.get(EstadoOportunidad.nueva, 0)
        + abiertas.get(EstadoOportunidad.en_gestion, 0),
        presupuestos_abiertos=abiertas.get(EstadoOportunidad.cotizada, 0),
        reservas_confirmadas=por_estado.get(EstadoViaje.confirmado, 0),
        viajes_activos=sum(
            n
            for estado, n in por_estado.items()
            if estado not in (EstadoViaje.finalizado, EstadoViaje.cancelado)
        ),
        alertas_pendientes=alertas,
        destinos_mas_vendidos=destinos,
        ventas_por_vendedor=_por_vendedor(viajes),
        filtro_responsable=filtro_responsable,
    )


def _comision(venta: VentaDelPeriodo) -> Decimal:
    return comision_del_vendedor(venta.comision_tipo, venta.comision_vendedor, venta.ganancia)


def _por_vendedor(viajes: list[VentaDelPeriodo]) -> list[VentasDeVendedor]:
    """Ventas y comisiones por vendedor; primero quien más viajes vendió."""
    filas: dict[uuid.UUID, VentasDeVendedor] = {}
    for v in viajes:
        fila = filas.setdefault(v.vendedor_id, VentasDeVendedor(v.vendedor_id, v.vendedor_nombre))
        fila.viajes += 1
        fila.ventas[v.moneda] += v.precio_venta
        fila.comisiones[v.moneda] += _comision(v)
    return sorted(filas.values(), key=lambda f: (-f.viajes, f.vendedor_nombre))


def _tasa_de_conversion(oportunidades: dict[EstadoOportunidad, int]) -> Decimal:
    """Ganadas sobre cerradas (ganadas + perdidas), a 4 decimales; 0 si no hay cerradas."""
    ganadas = oportunidades.get(EstadoOportunidad.ganada, 0)
    cerradas = ganadas + oportunidades.get(EstadoOportunidad.perdida, 0)
    if cerradas == 0:
        return Decimal(0)
    return (Decimal(ganadas) / cerradas).quantize(_FRACCION, rounding=ROUND_HALF_UP)
