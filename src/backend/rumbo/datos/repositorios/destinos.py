"""Repositorio del catálogo de destinos: `Destino` (CU-26)."""

from rumbo.datos.modelos import Destino
from rumbo.datos.modelos.catalogos import INDICE_NOMBRE_DESTINO
from rumbo.datos.repositorios.base import RepositorioCatalogo


class RepositorioDestinos(RepositorioCatalogo[Destino]):
    modelo = Destino
    etiqueta = "destino"
    indice = INDICE_NOMBRE_DESTINO
    columnas_busqueda = (Destino.nombre, Destino.pais)
