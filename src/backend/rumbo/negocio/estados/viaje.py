"""EST-Viaje: reservado → vendido → confirmado → en curso → finalizado | cancelado (CU-08,
CU-12 A0/A2/A3, CU-27; RF-038, RF-040, RF-042). Es lo único que cambia el estado de un viaje."""

from collections.abc import Iterable
from datetime import date, datetime
from decimal import Decimal

from rumbo.datos.modelos import Alerta, Viaje


def al_registrar_cobro(viaje: Viaje, *, saldo: Decimal) -> None:
    """T2 y T3: el primer cobro pasa `reservado` a `vendido`; si `saldo` (ya con este cobro)
    es cero, sigue a `confirmado` en la misma operación."""
    raise NotImplementedError


def al_revertir_cobro(viaje: Viaje, *, saldo: Decimal, quedan_cobros: bool) -> None:
    """T8 y T10: `confirmado` vuelve a `vendido` si `saldo` (ya sin el cobro) es mayor que
    cero; `vendido` vuelve a `reservado` si no `quedan_cobros`."""
    raise NotImplementedError


def iniciar(viaje: Viaje) -> None:
    """T4: `confirmado` → `en_curso`."""
    raise NotImplementedError


def finalizar(viaje: Viaje) -> None:
    """T5: `en_curso` → `finalizado`."""
    raise NotImplementedError


def corregir(
    viaje: Viaje, *, alertas: Iterable[Alerta] = (), ahora: datetime | None = None
) -> None:
    """T7: `en_curso` → `confirmado`, `finalizado` → `en_curso`. Al deshacer `finalizado`
    resuelve las alertas de reseña sin atender entre `alertas`."""
    raise NotImplementedError


def cancelar(viaje: Viaje, *, motivo: str, fecha: date) -> None:
    """T6: guarda `estado_previo`, motivo y fecha."""
    raise NotImplementedError


def revertir_cancelacion(viaje: Viaje) -> None:
    """T9: vuelve a `estado_previo` y limpia los datos de la cancelación."""
    raise NotImplementedError
