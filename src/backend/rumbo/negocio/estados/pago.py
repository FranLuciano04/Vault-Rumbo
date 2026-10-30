"""EST-Pago: pendiente | vencido -> pagado | anulado (CU-11, CU-12, CU-27; RF-066, RF-067, RF-070).
Es lo único que cambia el estado de un pago. Las transiciones inválidas lanzan
`TransicionInvalida` y dejan el pago intacto."""

from datetime import date
from decimal import Decimal

from rumbo.datos.modelos import EstadoPago, Pago
from rumbo.negocio.errores import DatosInvalidos, TransicionInvalida

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


def anular_por_cancelacion(pago: Pago) -> None:
    """T7: anula el pago no cobrado de un viaje que se cancela y lo marca, para que revertir la
    cancelación reabra solo los que anuló ella (CU-27 A3)."""
    anular(pago)
    pago.anulado_por_cancelacion = True


def reprogramar(pago: Pago, vencimiento: date, *, hoy: date) -> None:
    """CU-11 A3: cambia el vencimiento de un pago `pendiente` o `vencido`, que queda `pendiente`
    si la fecha nueva es hoy o posterior y `vencido` si ya pasó."""
    _exigir(pago, *_ABIERTOS, accion="reprogramar")
    pago.vencimiento = vencimiento
    _reabrir(pago, hoy=hoy)


def dividir(pago: Pago, monto_ahora: Decimal) -> Decimal:
    """CU-11 A6: deja en un pago `pendiente` o `vencido` solo `monto_ahora` y devuelve el resto,
    que va a un pago nuevo. `monto_ahora` es mayor a cero y menor al monto del pago."""
    _exigir(pago, *_ABIERTOS, accion="dividir")
    if not 0 < monto_ahora < pago.monto:
        raise DatosInvalidos(
            "monto_ahora",
            f"La parte a cobrar ahora tiene que ser mayor a cero y menor a {pago.monto}.",
        )
    resto = pago.monto - monto_ahora
    pago.monto = monto_ahora
    return resto


def revertir_anulacion(pago: Pago, *, hoy: date) -> None:
    """T10: al revertir la cancelación del viaje, `anulado` → `pendiente` o `vencido`, y se
    quita la marca de anulado por la cancelación."""
    _exigir(pago, EstadoPago.anulado, accion="revertir la anulación de")
    _reabrir(pago, hoy=hoy)
    pago.anulado_por_cancelacion = False


def vencer(pago: Pago, *, hoy: date) -> None:
    """T3: `pendiente` → `vencido`, solo si el vencimiento ya pasó."""
    _exigir(pago, EstadoPago.pendiente, accion="vencer")
    if pago.vencimiento >= hoy:
        raise TransicionInvalida("No se puede vencer un pago cuya fecha de vencimiento no pasó.")
    pago.estado = EstadoPago.vencido
