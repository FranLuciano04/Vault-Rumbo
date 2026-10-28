"""Repositorio de las reseñas de hoteles: `Resena` (CU-17)."""

from rumbo.datos.modelos import Resena
from rumbo.datos.repositorios.base import RepositorioBase


class RepositorioResenas(RepositorioBase[Resena]):
    modelo = Resena
