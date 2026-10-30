"""Servicio del dashboard: embudo e indicadores económicos del período, calculados en vivo
(CU-21, RF-123, RF-124, RF-127, RF-129)."""

import uuid
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import limites_del_dia
from rumbo.datos.modelos import EstadoOportunidad, Moneda, Usuario
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
    """Indicadores del período `[desde, hasta]`, inclusive. Admin y dueño ven toda la agencia y
    filtran por `responsable_id`; el resto ve solo lo suyo e ignora ese filtro (RF-129)."""
    if not es_direccion(actor):
        responsable_id = actor.id
    vista = visibilidad(actor)
    inicio, fin = limites_del_dia(desde)[0], limites_del_dia(hasta)[1]
    oportunidades = await _dashboard.oportunidades_por_estado(
        sesion, desde=inicio, hasta=fin, responsable_id=responsable_id, visibilidad=vista
    )
    viajes = await _dashboard.ventas(
        sesion, desde=inicio, hasta=fin, responsable_id=responsable_id, visibilidad=vista
    )
    cobrado = await _dashboard.cobrado(
        sesion, desde=desde, hasta=hasta, responsable_id=responsable_id, visibilidad=vista
    )
    pendiente = await _dashboard.pendiente_de_cobrar(
        sesion, desde=inicio, hasta=fin, responsable_id=responsable_id, visibilidad=vista
    )

    ventas: Totales = {}
    ganancia: Totales = {}
    comisiones: Totales = {}
    for v in viajes:
        ventas[v.moneda] = ventas.get(v.moneda, Decimal(0)) + v.precio_venta
        ganancia[v.moneda] = ganancia.get(v.moneda, Decimal(0)) + v.ganancia
        comision = comision_del_vendedor(v.comision_tipo, v.comision_vendedor, v.ganancia)
        comisiones[v.moneda] = comisiones.get(v.moneda, Decimal(0)) + comision
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
