"""Repositorio del módulo clientes: `Cliente` (CU-02, CU-03)."""

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from rumbo.datos.modelos import Cliente
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad

MAX_PARECIDOS = 10
_CON_TILDE = "áéíóúüÁÉÍÓÚÜ"
_SIN_TILDE = "aeiouuaeiouu"


def _normalizar(texto: str) -> str:
    """Minúsculas, sin tildes y con los espacios colapsados; igual a `_nombre_normalizado`."""
    return " ".join(texto.lower().translate(str.maketrans(_CON_TILDE, _SIN_TILDE)).split())


def _nombre_normalizado(columna: InstrumentedAttribute[str]) -> ColumnElement[str]:
    sin_tildes = func.translate(func.lower(columna), _CON_TILDE.lower(), _SIN_TILDE)
    return func.regexp_replace(func.btrim(sin_tildes), r"\s+", " ", "g")


class RepositorioClientes(RepositorioBase[Cliente]):
    modelo = Cliente

    async def buscar_parecidos(
        self, sesion: AsyncSession, *, nombre: str, contacto: str, visibilidad: Visibilidad
    ) -> list[Cliente]:
        """Hasta `MAX_PARECIDOS` clientes con el mismo contacto (sin distinguir mayúsculas) o el
        mismo nombre (sin distinguir mayúsculas, tildes ni espacios de más)."""
        consulta = select(Cliente).where(
            or_(
                func.lower(Cliente.contacto) == contacto.lower(),
                _nombre_normalizado(Cliente.nombre) == _normalizar(nombre),
            )
        )
        consulta = visibilidad.aplicar(consulta, Cliente)
        consulta = consulta.order_by(Cliente.created_at, Cliente.id).limit(MAX_PARECIDOS)
        return list(await sesion.scalars(consulta))
