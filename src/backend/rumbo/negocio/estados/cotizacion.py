"""EST-Cotización: borrador → enviada → aceptada | rechazada | vencida (CU-06, RF-021 a RF-024).
Una nueva versión no es una transición: es otra `Cotizacion` y las anteriores quedan intactas."""

from datetime import date
from decimal import Decimal
from typing import Any

from rumbo.core.fechas import sumar_meses
from rumbo.datos.modelos import Cotizacion, EstadoCotizacion, Moneda, Oportunidad
from rumbo.negocio.errores import DatosInvalidos
from rumbo.negocio.estados import oportunidad as estado_oportunidad

_TOTAL_MAXIMO = Decimal("999999999999.99")  # lo que entra en la columna Numeric(14, 2)


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
    estado de la oportunidad: pasa a `cotizada` al marcarla enviada (EST-Oportunidad T3). Un
    total que no entra en la columna es `DatosInvalidos` (422), no un error de la base."""
    estado_oportunidad.exigir_abierta(oportunidad, accion="cotizar")
    total = sum((Decimal(i["precio"]) for i in items), Decimal(0))
    if total > _TOTAL_MAXIMO:
        raise DatosInvalidos("items", "La suma de los precios supera el total máximo admitido.")
    return Cotizacion(
        oportunidad_id=oportunidad.id,
        fecha=fecha,
        moneda=moneda,
        items=[{"concepto": i["concepto"], "precio": str(i["precio"])} for i in items],
        total=total,
        validez_hasta=sumar_meses(fecha, vigencia_meses),
        estado=EstadoCotizacion.borrador,
    )


def enviar(cotizacion: Cotizacion, oportunidad: Oportunidad) -> None:
    """T2: `borrador` → `enviada`; la oportunidad pasa a `cotizada` (EST-Oportunidad T3)."""
    raise NotImplementedError


def aceptar(cotizacion: Cotizacion, oportunidad: Oportunidad) -> None:
    """T3: `enviada` → `aceptada` (CU-06 A2)."""
    raise NotImplementedError


def rechazar(cotizacion: Cotizacion, oportunidad: Oportunidad) -> None:
    """T4: `enviada` → `rechazada` (CU-06 A3)."""
    raise NotImplementedError
