"""Repositorio del catálogo de operadores: `Operador` (CU-31, DEC-0009)."""

from rumbo.datos.modelos import Operador
from rumbo.datos.modelos.catalogos import INDICE_NOMBRE_OPERADOR
from rumbo.datos.repositorios.base import RepositorioCatalogo


class RepositorioOperadores(RepositorioCatalogo[Operador]):
    modelo = Operador
    etiqueta = "operador"
    indice = INDICE_NOMBRE_OPERADOR
    columnas_busqueda = (Operador.nombre,)
