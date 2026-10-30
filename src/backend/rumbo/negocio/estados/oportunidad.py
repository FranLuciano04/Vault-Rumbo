"""EST-Oportunidad: nueva → en gestión → cotizada → ganada | perdida; una perdida se reactiva
(CU-05, RF-016, RF-017, RF-020). Pasar a `cotizada` lo hace la cotización (CU-06)."""

from rumbo.datos.modelos import EstadoOportunidad, MotivoPerdida, Oportunidad
from rumbo.negocio.errores import DatosInvalidos, TransicionInvalida

_ABIERTAS = (EstadoOportunidad.nueva, EstadoOportunidad.en_gestion, EstadoOportunidad.cotizada)


def _exigir(oportunidad: Oportunidad, *validos: EstadoOportunidad, accion: str) -> None:
    if oportunidad.estado not in validos:
        raise TransicionInvalida(
            f"No se puede {accion} una oportunidad {oportunidad.estado.value}."
        )


def exigir_abierta(oportunidad: Oportunidad, *, accion: str) -> None:
    """`TransicionInvalida` si la oportunidad ya está cerrada (`ganada` o `perdida`)."""
    _exigir(oportunidad, *_ABIERTAS, accion=accion)


def exigir_agendable(oportunidad: Oportunidad) -> None:
    """`DatosInvalidos` si la oportunidad ya está cerrada: no admite insistencias (RF-015)."""
    if oportunidad.estado not in _ABIERTAS:
        raise DatosInvalidos(
            "estado",
            f"No se puede agendar una insistencia en una oportunidad {oportunidad.estado.value}.",
        )


def pasar_a_en_gestion(oportunidad: Oportunidad) -> None:
    """T2: el vendedor toma una consulta nueva."""
    _exigir(oportunidad, EstadoOportunidad.nueva, accion="pasar a en gestión")
    oportunidad.estado = EstadoOportunidad.en_gestion


def pasar_a_cotizada(oportunidad: Oportunidad) -> None:
    """T3: se envía una cotización; si ya estaba `cotizada` (otra versión), queda igual."""
    exigir_abierta(oportunidad, accion="cotizar")
    oportunidad.estado = EstadoOportunidad.cotizada


def perder(oportunidad: Oportunidad, motivo: MotivoPerdida, detalle: str | None = None) -> None:
    """T5: cierra una abierta como perdida con su motivo (RF-017, CU-05 A2)."""
    _exigir(oportunidad, *_ABIERTAS, accion="perder")
    oportunidad.estado = EstadoOportunidad.perdida
    oportunidad.motivo_perdida = motivo
    oportunidad.motivo_perdida_detalle = detalle


def reactivar(oportunidad: Oportunidad) -> None:
    """T8: una perdida vuelve a en gestión y pierde el motivo (RF-020, CU-05 A3)."""
    _exigir(oportunidad, EstadoOportunidad.perdida, accion="reactivar")
    oportunidad.estado = EstadoOportunidad.en_gestion
    oportunidad.motivo_perdida = None
    oportunidad.motivo_perdida_detalle = None


def ganar(oportunidad: Oportunidad) -> None:
    """T4: cierra una abierta como ganada, con o sin cotización formal (RF-016, CU-05 A4)."""
    _exigir(oportunidad, *_ABIERTAS, accion="ganar")
    oportunidad.estado = EstadoOportunidad.ganada


def confirmar_reserva(oportunidad: Oportunidad, *, con_cotizacion_aceptada: bool) -> None:
    """T4 al confirmar la reserva (CU-07 paso 3): una `cotizada` con su cotización aceptada pasa a
    `ganada`; una ya `ganada` por venta directa queda igual (A1). Cualquier otra no admite la
    reserva: `TransicionInvalida`."""
    if oportunidad.estado is EstadoOportunidad.ganada:
        return
    if oportunidad.estado is not EstadoOportunidad.cotizada or not con_cotizacion_aceptada:
        raise TransicionInvalida(
            "Para confirmar la reserva, la oportunidad tiene que estar cotizada con una "
            f"cotización aceptada, o ganada por venta directa; está {oportunidad.estado.value}."
        )
    ganar(oportunidad)
