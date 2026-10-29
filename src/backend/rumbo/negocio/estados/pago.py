"""EST-Pago: pendiente | vencido -> pagado | anulado (CU-11, CU-12, CU-27; RF-066, RF-067, RF-070).
Es lo único que cambia el estado de un pago. Las transiciones inválidas lanzan
`TransicionInvalida` y dejan el pago intacto."""

from datetime import date

from rumbo.datos.modelos import EstadoPago, Pago
from rumbo.negocio.errores import TransicionInvalida

_ABIERTOS = (EstadoPago.pendiente, EstadoPago.vencido)


def _exigir(pago: Pago, *validos: EstadoPago, accion: str) -> None:
    if pago.estado not in validos:
        raise TransicionInvalida(f"No se puede {accion} un pago {pago.estado.value}.")


def _reabrir(pago: Pago, *, hoy: date) -> None:
    """Vuelve a `pendiente` si el vencimiento es hoy o posterior, o a `vencido` si ya pasó."""
    pago.estado = EstadoPago.vencido if pago.vencimiento < hoy else EstadoPago.pendiente


def cobrar(pago: Pago) -> None:
    """T2 y T4: `pendiente` o `vencido` → `pagado`. Los datos del cobro los carga quien cobra."""
    _exigir(pago, *_ABIERTOS, accion="cobrar")
    pago.estado = EstadoPago.pagado


def revertir_cobro(pago: Pago, *, hoy: date) -> None:
    """T6: `pagado` → `pendiente` o `vencido` según el vencimiento, y limpia los datos del cobro."""
    _exigir(pago, EstadoPago.pagado, accion="revertir el cobro de")
    _reabrir(pago, hoy=hoy)
    pago.forma_pago = None
    pago.moneda_pago = None
    pago.tipo_cambio = None
    pago.monto_cobrado = None
    pago.fecha_cobro = None


def anular(pago: Pago) -> None:
    """T5, T7 y T8: `pendiente` o `vencido` → `anulado`. Un pago cobrado no se anula."""
    _exigir(pago, *_ABIERTOS, accion="anular")
    pago.estado = EstadoPago.anulado


def revertir_anulacion(pago: Pago, *, hoy: date) -> None:
    """T10: al revertir la cancelación del viaje, `anulado` → `pendiente` o `vencido`."""
    _exigir(pago, EstadoPago.anulado, accion="revertir la anulación de")
    _reabrir(pago, hoy=hoy)


def vencer(pago: Pago, *, hoy: date) -> None:
    """T3: `pendiente` → `vencido`, solo si el vencimiento ya pasó."""
    _exigir(pago, EstadoPago.pendiente, accion="vencer")
    if pago.vencimiento >= hoy:
        raise TransicionInvalida("No se puede vencer un pago cuya fecha de vencimiento no pasó.")
    pago.estado = EstadoPago.vencido
