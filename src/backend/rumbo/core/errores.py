"""Errores de dominio. Viven en core para que datos (404 por visibilidad) y negocio los lancen
sin depender entre sí; presentación los traduce a problem+json."""

from typing import Any


class ErrorDeDominio(Exception):
    """`extra` son campos serializables que la presentación vuelca tal cual en el problem+json."""

    def __init__(self, detalle: str = "", extra: dict[str, Any] | None = None) -> None:
        super().__init__(detalle)
        self.detalle = detalle
        self.extra = extra or {}


class NoEncontrado(ErrorDeDominio):
    pass


class SinPermiso(ErrorDeDominio):
    pass


class TransicionInvalida(ErrorDeDominio):
    pass


class Conflicto(ErrorDeDominio):
    pass


class DatosInvalidos(ErrorDeDominio):
    """Un dato que el esquema no puede validar solo (p. ej. una referencia a otra fila): 422."""

    def __init__(self, campo: str, mensaje: str) -> None:
        super().__init__("Los datos enviados no son válidos.")
        self.extra = {"errores": [{"campo": campo, "mensaje": mensaje}]}


class ServicioExterno(ErrorDeDominio):
    pass
