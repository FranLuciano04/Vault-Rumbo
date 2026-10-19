"""Errores de dominio. Viven en core para que datos (404 por visibilidad) y negocio los lancen
sin depender entre sí; presentación los traduce a problem+json."""


class ErrorDeDominio(Exception):
    def __init__(self, detalle: str = "") -> None:
        super().__init__(detalle)
        self.detalle = detalle


class NoEncontrado(ErrorDeDominio):
    pass


class SinPermiso(ErrorDeDominio):
    pass


class TransicionInvalida(ErrorDeDominio):
    pass


class Conflicto(ErrorDeDominio):
    pass


class ServicioExterno(ErrorDeDominio):
    pass
