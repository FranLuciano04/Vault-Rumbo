"""Repositorio base: toda lectura pasa por el filtro de visibilidad que decide negocio (RF-151)."""

import uuid
from typing import Any, ClassVar, Protocol

from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from rumbo.core.errores import NoEncontrado

_CON_TILDE = "áéíóúüÁÉÍÓÚÜ"
_SIN_TILDE = "aeiouuaeiouu"


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes y con los espacios colapsados; igual a `nombre_normalizado`."""
    return " ".join(texto.lower().translate(str.maketrans(_CON_TILDE, _SIN_TILDE)).split())


def nombre_normalizado(columna: InstrumentedAttribute[str]) -> ColumnElement[str]:
    """Lo mismo que `normalizar`, evaluado en la base sobre una columna."""
    sin_tildes = func.translate(func.lower(columna), _CON_TILDE.lower(), _SIN_TILDE)
    return func.regexp_replace(func.btrim(sin_tildes), r"\s+", " ", "g")


class Visibilidad(Protocol):
    """Filtro por fila que arma `negocio.politicas.visibilidad(actor)`; datos no lo conoce."""

    def aplicar[S: Select[Any]](self, consulta: S, modelo: type) -> S: ...


class RepositorioBase[T]:
    """Sin estado: cada subclase fija `modelo` y recibe la sesión y la visibilidad por llamada."""

    modelo: ClassVar[type[Any]]

    async def obtener(self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad) -> T:
        """Fila por id; si no existe o el actor no la ve, `NoEncontrado` (404, nunca 403)."""
        consulta = visibilidad.aplicar(select(self.modelo).where(self.modelo.id == id), self.modelo)
        fila: T | None = await sesion.scalar(consulta)
        if fila is None:
            raise NoEncontrado(f"{self.modelo.__name__} {id} no encontrado")
        return fila

    async def listar(self, sesion: AsyncSession, *, visibilidad: Visibilidad) -> list[T]:
        """Todas las filas que el actor ve."""
        consulta = visibilidad.aplicar(select(self.modelo), self.modelo)
        return list(await sesion.scalars(consulta))
