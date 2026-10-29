"""EST-Cotización: borrador → enviada → aceptada | rechazada | vencida (CU-06, RF-021 a RF-024).
Una nueva versión no es una transición: es otra `Cotizacion` y las anteriores quedan intactas."""

from collections.abc import Sequence
from datetime import date
from decimal import Decimal
from typing import Any

from rumbo.core import fechas
from rumbo.core.fechas import sumar_meses
from rumbo.datos.modelos import Cotizacion, EstadoCotizacion, Moneda, Oportunidad
from rumbo.negocio.errores import Conflicto, DatosInvalidos, TransicionInvalida
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
    total que no entra en la columna es `DatosInvalidos` (422), no un error de la base. Sin destino
    o sin pasajeros no se cotiza: `Conflicto` (409, DEC-0023)."""
    estado_oportunidad.exigir_abierta(oportunidad, accion="cotizar")
    faltan = [
        nombre
        for nombre, valor in (
            ("destino", oportunidad.destino_consultado),
            ("pasajeros", oportunidad.pasajeros),
        )
        if valor is None
    ]
    if faltan:
        raise Conflicto(f"Para cotizar, la oportunidad necesita {' y '.join(faltan)} (DEC-0023).")
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


def _exigir(cotizacion: Cotizacion, origen: EstadoCotizacion, *, accion: str) -> None:
    if cotizacion.estado is not origen:
        raise TransicionInvalida(f"No se puede {accion} una cotización {cotizacion.estado.value}.")


def enviar(cotizacion: Cotizacion, oportunidad: Oportunidad) -> None:
    """T2: `borrador` → `enviada`; la oportunidad pasa a `cotizada` (EST-Oportunidad T3). Con la
    oportunidad cerrada no se envía."""
    _exigir(cotizacion, EstadoCotizacion.borrador, accion="enviar")
    estado_oportunidad.pasar_a_cotizada(oportunidad)
    cotizacion.estado = EstadoCotizacion.enviada


def aceptar(cotizacion: Cotizacion, oportunidad: Oportunidad, *, hoy: date | None = None) -> None:
    """T3: `enviada` → `aceptada` (CU-06 A2) y la oportunidad queda `cotizada`, lista para
    confirmar la reserva (la gana CU-07, EST-Oportunidad T4); también si venía `en_gestion` tras
    reactivarla. Con la oportunidad cerrada no se acepta, porque ya no hay reserva que confirmar.
    Tampoco si su `validez_hasta` ya pasó al día de negocio `hoy` (por defecto, el de hoy), aunque
    el proceso diario todavía no la haya marcado `vencida` (T5); el último día de vigencia sigue
    aceptable. Que sea la vigente y la única aceptada lo exige `exigir_vigente_sin_aceptada`."""
    _exigir(cotizacion, EstadoCotizacion.enviada, accion="aceptar")
    if cotizacion.validez_hasta < (hoy or fechas.hoy()):
        raise TransicionInvalida("No se puede aceptar una cotización con la vigencia vencida.")
    estado_oportunidad.exigir_abierta(oportunidad, accion="aceptar la cotización de")
    estado_oportunidad.pasar_a_cotizada(oportunidad)
    cotizacion.estado = EstadoCotizacion.aceptada


def exigir_vigente_sin_aceptada(cotizacion: Cotizacion, versiones: Sequence[Cotizacion]) -> None:
    """Solo se acepta la vigente, la primera de `versiones` en el orden del historial (`fecha` y
    `created_at` desc), y si ninguna otra versión de la oportunidad ya fue aceptada: la aceptada
    fija la moneda de referencia del `Viaje` (EST-Cotización T3)."""
    if any(v.estado is EstadoCotizacion.aceptada and v.id != cotizacion.id for v in versiones):
        raise TransicionInvalida("Otra versión de esta oportunidad ya fue aceptada.")
    if not versiones or versiones[0].id != cotizacion.id:
        raise TransicionInvalida("Solo se puede aceptar la versión vigente de la cotización.")


def rechazar(cotizacion: Cotizacion, oportunidad: Oportunidad) -> None:
    """T4: `enviada` → `rechazada` (CU-06 A3). La oportunidad no cambia: el seguimiento continúa
    o se cierra perdida por CU-05."""
    _exigir(cotizacion, EstadoCotizacion.enviada, accion="rechazar")
    cotizacion.estado = EstadoCotizacion.rechazada
