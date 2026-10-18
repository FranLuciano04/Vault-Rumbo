"""Errores de dominio que lanzan los servicios; se definen en `rumbo.core.errores`."""

from rumbo.core.errores import (
    Conflicto,
    ErrorDeDominio,
    NoEncontrado,
    ServicioExterno,
    SinPermiso,
    TransicionInvalida,
)

__all__ = [
    "Conflicto",
    "ErrorDeDominio",
    "NoEncontrado",
    "ServicioExterno",
    "SinPermiso",
    "TransicionInvalida",
]
