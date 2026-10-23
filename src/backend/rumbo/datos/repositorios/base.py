"""Repositorio base: toda lectura pasa por el filtro de visibilidad que decide negocio (RF-151)."""

import uuid
from typing import Any, ClassVar, Protocol

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos.base import CON_TILDE, SIN_TILDE, nombre_normalizado


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes y con los espacios colapsados; igual a `nombre_normalizado`."""
    return " ".join(texto.translate(str.maketrans(CON_TILDE, SIN_TILDE)).lower().split())


def escapar_like(texto: str) -> str:
    """Escapa los comodines de LIKE para que `buscar` los trate como texto literal."""
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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


class RepositorioCatalogo[T](RepositorioBase[T]):
    """Catálogo con nombre único y baja lógica (`Destino`, `Operador`; DEC-0009). Cada subclase
    fija `modelo`, `etiqueta` (para el 409), `indice` (el índice único del nombre) y
    `columnas_busqueda` (dónde busca `paginar`, además del nombre)."""

    etiqueta: ClassVar[str]
    indice: ClassVar[str]
    columnas_busqueda: ClassVar[tuple[InstrumentedAttribute[str], ...]]

    async def buscar_por_nombre(
        self,
        sesion: AsyncSession,
        nombre: str,
        *,
        excluir_id: uuid.UUID | None = None,
        visibilidad: Visibilidad,
    ) -> T | None:
        """Fila con el mismo nombre sin distinguir mayúsculas, tildes ni espacios de más,
        activa o no. `excluir_id` deja afuera la fila que se está editando."""
        consulta = select(self.modelo).where(
            nombre_normalizado(self.modelo.nombre) == normalizar(nombre)
        )
        if excluir_id is not None:
            consulta = consulta.where(self.modelo.id != excluir_id)
        consulta = visibilidad.aplicar(consulta, self.modelo)
        return await sesion.scalar(consulta.limit(1))

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        activo: bool,
        buscar: str | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[T], int]:
        """Página ordenada por nombre y el total que cumple los filtros. `buscar` mira las
        `columnas_busqueda` sin distinguir mayúsculas, tildes ni espacios de más."""
        consulta = visibilidad.aplicar(select(self.modelo), self.modelo)
        consulta = consulta.where(self.modelo.activo == activo)
        if buscar:
            patron = f"%{escapar_like(normalizar(buscar))}%"
            consulta = consulta.where(
                or_(
                    *(
                        nombre_normalizado(columna).like(patron, escape="\\")
                        for columna in self.columnas_busqueda
                    )
                )
            )
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(nombre_normalizado(self.modelo.nombre), self.modelo.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0
