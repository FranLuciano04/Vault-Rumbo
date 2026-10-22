"""Errores de dominio que lanzan los servicios; los comunes se definen en `rumbo.core.errores`."""

from rumbo.core.errores import (
    Conflicto,
    ErrorDeDominio,
    NoEncontrado,
    ServicioExterno,
    SinPermiso,
    TransicionInvalida,
)
from rumbo.datos.modelos import Cliente


class PosibleDuplicado(Conflicto):
    """El alta de un `Cliente` se parece a fichas existentes (CU-02 A1): el 409 las trae."""

    def __init__(self, duplicados: list[Cliente]) -> None:
        super().__init__("Ya hay clientes con el mismo contacto o nombre. Confirmá para crearlo.")
        self.duplicados = duplicados


__all__ = [
    "Conflicto",
    "ErrorDeDominio",
    "NoEncontrado",
    "PosibleDuplicado",
    "ServicioExterno",
    "SinPermiso",
    "TransicionInvalida",
]
