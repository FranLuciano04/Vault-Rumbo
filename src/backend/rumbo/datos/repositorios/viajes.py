"""Repositorio de `Viaje`."""

from rumbo.datos.modelos import Viaje
from rumbo.datos.repositorios.base import RepositorioBase


class RepositorioViajes(RepositorioBase[Viaje]):
    modelo = Viaje
