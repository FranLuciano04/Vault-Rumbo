"""Servicio del dashboard: embudo e indicadores económicos del período, calculados en vivo
(CU-21, RF-123, RF-124, RF-127, RF-129)."""

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import DatosInvalidos
from rumbo.core.fechas import limites_del_dia
from rumbo.datos.modelos import EstadoOportunidad, Moneda, RolUsuario, Usuario
from rumbo.datos.repositorios.dashboard import RepositorioDashboard
from rumbo.negocio.calculos import comision_del_vendedor
from rumbo.negocio.politicas import es_direccion, visibilidad

_dashboard = RepositorioDashboard()

_FRACCION = Decimal("0.0001")

Totales = dict[Moneda, Decimal]


@dataclass(frozen=True)
class IndicadoresEconomicos:
    """Embudo e importes por moneda; las monedas sin movimiento no figuran."""

    etapas: dict[EstadoOportunidad, int]
    tasa_conversion: Decimal
    ventas: Totales
    ganancia_estimada: Totales
    margen: Totales
    comisiones: Totales
    cobrado: Totales
    pendiente_de_cobrar: Totales


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
    `pendiente_de_cobrar` es la foto de hoy, sin acotar al período."""
    if desde > hasta:
        raise DatosInvalidos("hasta", "La fecha final no puede ser anterior a la inicial.")
    # Quién cobra comisión: la persona filtrada (dirección) o el propio actor (DEC-0024 §6).
    vendedor_id = responsable_id if es_direccion(actor) else actor.id
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

    ventas: Totales = defaultdict(Decimal)
    ganancia: Totales = defaultdict(Decimal)
    comisiones: Totales = defaultdict(Decimal)
    for v in viajes:
        ventas[v.moneda] += v.precio_venta
        ganancia[v.moneda] += v.ganancia
    for v in vendidos:
        comisiones[v.moneda] += comision_del_vendedor(
            v.comision_tipo, v.comision_vendedor, v.ganancia
        )
    margen = {
        moneda: (ganancia[moneda] / total).quantize(_FRACCION, rounding=ROUND_HALF_UP)
        for moneda, total in ventas.items()
        if total > 0
    }
    return IndicadoresEconomicos(
        etapas={e: oportunidades.get(e, 0) for e in EstadoOportunidad},
        tasa_conversion=_tasa_de_conversion(oportunidades),
        ventas=ventas,
        ganancia_estimada=ganancia,
        margen=margen,
        comisiones=comisiones,
        cobrado=cobrado,
        pendiente_de_cobrar=pendiente,
    )


def _tasa_de_conversion(oportunidades: dict[EstadoOportunidad, int]) -> Decimal:
    """Ganadas sobre cerradas (ganadas + perdidas), a 4 decimales; 0 si no hay cerradas."""
    ganadas = oportunidades.get(EstadoOportunidad.ganada, 0)
    cerradas = ganadas + oportunidades.get(EstadoOportunidad.perdida, 0)
    if cerradas == 0:
        return Decimal(0)
    return (Decimal(ganadas) / cerradas).quantize(_FRACCION, rounding=ROUND_HALF_UP)
