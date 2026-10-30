"""EST-Viaje: reservado → vendido → confirmado → en curso → finalizado | cancelado (CU-08,
CU-12 A0/A2/A3, CU-27; RF-038, RF-040, RF-042). Es lo único que cambia el estado de un viaje."""

from collections.abc import Iterable
from datetime import UTC, date, datetime
from decimal import Decimal

from rumbo.datos.modelos import Alerta, EstadoAlerta, EstadoViaje, TipoAlerta, Viaje
from rumbo.negocio.errores import TransicionInvalida
from rumbo.negocio.estados import alerta as estado_alerta

_CANCELABLES = (
    EstadoViaje.reservado,
    EstadoViaje.vendido,
    EstadoViaje.confirmado,
    EstadoViaje.en_curso,
)


def _exigir(viaje: Viaje, *validos: EstadoViaje, accion: str) -> None:
    if viaje.estado not in validos:
        raise TransicionInvalida(f"No se puede {accion} un viaje {viaje.estado.value}.")


def al_registrar_cobro(viaje: Viaje, *, saldo: Decimal, plan_balanceado: bool = True) -> None:
    """T2 y T3: el primer cobro pasa `reservado` a `vendido`; si `saldo` (ya con este cobro)
    es cero, sigue a `confirmado` en la misma operación. Con el plan descalzado del precio no
    confirma aunque el saldo sea cero: primero hay que rebalancearlo (CU-10 A4). Un saldo
    negativo es un error de cálculo de quien llama: `TransicionInvalida`."""
    _exigir(viaje, EstadoViaje.reservado, EstadoViaje.vendido, accion="registrar un cobro en")
    if saldo < 0:
        raise TransicionInvalida("Un cobro no puede dejar el saldo del viaje negativo.")
    saldado = saldo == 0 and plan_balanceado
    viaje.estado = EstadoViaje.confirmado if saldado else EstadoViaje.vendido


def al_revertir_cobro(viaje: Viaje, *, saldo: Decimal, quedan_cobros: bool) -> None:
    """T8 y T10: `confirmado` vuelve a `vendido` si `saldo` (ya sin el cobro) es mayor que
    cero; `vendido` vuelve a `reservado` si no `quedan_cobros`. Con un pago único, revertir
    el único cobro encadena T8 y T10, igual que su cobro encadenó T2 y T3. Revertir un cobro de
    un `confirmado` sin que vuelva a quedar saldo es incoherente: `TransicionInvalida`."""
    _exigir(viaje, EstadoViaje.vendido, EstadoViaje.confirmado, accion="revertir un cobro de")
    if viaje.estado is EstadoViaje.confirmado:
        if saldo <= 0:
            raise TransicionInvalida("Revertir un cobro de un viaje confirmado deja saldo.")
        viaje.estado = EstadoViaje.vendido
    if viaje.estado is EstadoViaje.vendido and not quedan_cobros:
        viaje.estado = EstadoViaje.reservado


def iniciar(viaje: Viaje) -> None:
    """T4: `confirmado` → `en_curso`. La secuencia es estricta: sin el total pagado no inicia."""
    _exigir(viaje, EstadoViaje.confirmado, accion="iniciar")
    viaje.estado = EstadoViaje.en_curso


def finalizar(viaje: Viaje) -> None:
    """T5: `en_curso` → `finalizado`."""
    _exigir(viaje, EstadoViaje.en_curso, accion="finalizar")
    viaje.estado = EstadoViaje.finalizado


def corregir(
    viaje: Viaje, *, alertas: Iterable[Alerta] = (), ahora: datetime | None = None
) -> None:
    """T7: `en_curso` → `confirmado`, `finalizado` → `en_curso`. Al deshacer `finalizado`
    resuelve las alertas de reseña sin atender de este viaje entre `alertas` (DEC-0021)."""
    _exigir(viaje, EstadoViaje.en_curso, EstadoViaje.finalizado, accion="corregir")
    if viaje.estado is EstadoViaje.en_curso:
        viaje.estado = EstadoViaje.confirmado
        return
    viaje.estado = EstadoViaje.en_curso
    resuelta_en = ahora or datetime.now(UTC)
    for alerta in alertas:
        if (
            alerta.viaje_id == viaje.id
            and alerta.tipo is TipoAlerta.resena
            and alerta.estado is not EstadoAlerta.resuelta
        ):
            estado_alerta.resolver(alerta, resuelta_en)


def cancelar(viaje: Viaje, *, motivo: str, fecha: date) -> None:
    """T6: guarda `estado_previo`, motivo y fecha. Desde `finalizado` no se cancela (CU-27 A1).
    Después de cancelar, `estado` siempre es `cancelado`: el servicio de CU-27 decide si la
    comisión se mantiene (A4, cancelación desde `en_curso`) mirando `estado_previo`."""
    _exigir(viaje, *_CANCELABLES, accion="cancelar")
    viaje.estado_previo = viaje.estado
    viaje.motivo_cancelacion = motivo
    viaje.fecha_cancelacion = fecha
    viaje.estado = EstadoViaje.cancelado


def revertir_cancelacion(viaje: Viaje) -> None:
    """T9: vuelve a `estado_previo` y limpia los datos de la cancelación (CU-27 A3)."""
    _exigir(viaje, EstadoViaje.cancelado, accion="revertir la cancelación de")
    if viaje.estado_previo not in _CANCELABLES:
        raise TransicionInvalida("El viaje cancelado no tiene un estado previo al que volver.")
    viaje.estado = viaje.estado_previo
    viaje.estado_previo = None
    viaje.motivo_cancelacion = None
    viaje.fecha_cancelacion = None
