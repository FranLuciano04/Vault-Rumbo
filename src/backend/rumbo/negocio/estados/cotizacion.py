"""EST-Cotización: borrador → enviada → aceptada | rechazada | vencida (CU-06, RF-021 a RF-024).
Una nueva versión no es una transición: es otra `Cotizacion` y las anteriores quedan intactas."""

from datetime import date
from decimal import Decimal
from typing import Any

from rumbo.core.fechas import sumar_meses
from rumbo.datos.modelos import Cotizacion, EstadoCotizacion, Moneda, Oportunidad
from rumbo.negocio.estados import oportunidad as estado_oportunidad


def emitir(
    oportunidad: Oportunidad,
    *,
    moneda: Moneda,
    items: list[dict[str, Any]],
    fecha: date,
    vigencia_meses: int,
) -> Cotizacion:
    """T1: nueva versión en `borrador` desde una oportunidad abierta (RF-021). El total es la suma
    exacta de los precios y la vigencia, `fecha` más `vigencia_meses` (RF-022). No cambia el
    estado de la oportunidad: pasa a `cotizada` al marcarla enviada (EST-Oportunidad T3)."""
    estado_oportunidad.exigir_abierta(oportunidad, accion="cotizar")
    return Cotizacion(
        oportunidad_id=oportunidad.id,
        fecha=fecha,
        moneda=moneda,
        items=[{"concepto": i["concepto"], "precio": str(i["precio"])} for i in items],
        total=sum((Decimal(i["precio"]) for i in items), Decimal(0)),
        validez_hasta=sumar_meses(fecha, vigencia_meses),
        estado=EstadoCotizacion.borrador,
    )
