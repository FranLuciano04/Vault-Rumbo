"""Errores de dominio que lanzan los servicios; los comunes se definen en `rumbo.core.errores`."""

from rumbo.core.errores import (
    Conflicto,
    DatosInvalidos,
    ErrorDeDominio,
    NoEncontrado,
    ServicioExterno,
    SinPermiso,
    TransicionInvalida,
)
from rumbo.datos.modelos import Cliente, Hotel


class PosibleDuplicado(Conflicto):
    """El alta o la edición de un `Cliente` se parece a fichas existentes (CU-02 A1, CU-03): el 409
    las trae."""

    def __init__(self, duplicados: list[Cliente]) -> None:
        super().__init__("Ya hay clientes con el mismo contacto o nombre. Confirmá para continuar.")
        self.duplicados = duplicados  # la presentación los vuelca en `extra` como esquema


class HotelDuplicado(Conflicto):
    """El alta o la edición de un `Hotel` repite el nombre de uno activo del destino (CU-16 A2,
    RF-099): el 409 trae el existente para abrirlo."""

    def __init__(self, existente: Hotel) -> None:
        super().__init__(f"Ya existe un hotel llamado «{existente.nombre}» en ese destino.")
        self.existente = existente  # la presentación lo vuelca en `extra` como esquema


__all__ = [
    "Conflicto",
    "DatosInvalidos",
    "ErrorDeDominio",
    "HotelDuplicado",
    "NoEncontrado",
    "PosibleDuplicado",
    "ServicioExterno",
    "SinPermiso",
    "TransicionInvalida",
]
