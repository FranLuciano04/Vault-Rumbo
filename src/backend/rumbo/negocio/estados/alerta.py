"""EST-Alerta: pendiente → vista → resuelta; posponer cambia la fecha (CU-14, RF-079)."""

from datetime import date, datetime

from rumbo.datos.modelos import Alerta, EstadoAlerta
from rumbo.negocio.errores import DatosInvalidos, TransicionInvalida


def _exigir(alerta: Alerta, *validos: EstadoAlerta, accion: str) -> None:
    if alerta.estado not in validos:
        raise TransicionInvalida(f"No se puede {accion} una alerta {alerta.estado.value}.")


def marcar_vista(alerta: Alerta) -> None:
    _exigir(alerta, EstadoAlerta.pendiente, accion="marcar como vista")
    alerta.estado = EstadoAlerta.vista


def desmarcar_vista(alerta: Alerta) -> None:
    _exigir(alerta, EstadoAlerta.vista, accion="desmarcar")
    alerta.estado = EstadoAlerta.pendiente


def resolver(alerta: Alerta, resuelta_en: datetime) -> None:
    _exigir(alerta, EstadoAlerta.pendiente, EstadoAlerta.vista, accion="resolver")
    alerta.estado = EstadoAlerta.resuelta
    alerta.resuelta_en = resuelta_en


def reabrir(alerta: Alerta) -> None:
    _exigir(alerta, EstadoAlerta.resuelta, accion="reabrir")
    alerta.estado = EstadoAlerta.pendiente
    alerta.resuelta_en = None
    alerta.cerrada_por_cancelacion = False


def posponer(alerta: Alerta, nueva_fecha: date) -> None:
    """Solo una pendiente, y a un día posterior al actual."""
    _exigir(alerta, EstadoAlerta.pendiente, accion="posponer")
    if nueva_fecha <= alerta.fecha:
        raise DatosInvalidos("fecha", "La nueva fecha tiene que ser posterior a la actual.")
    alerta.fecha = nueva_fecha
