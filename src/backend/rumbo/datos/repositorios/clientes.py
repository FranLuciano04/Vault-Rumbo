"""Repositorio del módulo clientes: `Cliente` (CU-02, CU-03)."""

import uuid

from sqlalchemy import ColumnElement, exists, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, SegmentoCliente
from rumbo.datos.modelos.base import espacios_colapsados, nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, escapar_like, normalizar

MAX_PARECIDOS = 10


def _tiene_etiqueta(clave: str) -> ColumnElement[bool]:
    """El `Cliente` tiene una etiqueta cuya clave normalizada es `clave`."""
    etiqueta = func.unnest(Cliente.etiquetas).table_valued("etiqueta").render_derived().c.etiqueta
    return exists().where(nombre_normalizado(etiqueta) == clave).correlate(Cliente)


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
                nombre_normalizado(Cliente.nombre) == normalizar(nombre),
            )
        )
        consulta = visibilidad.aplicar(consulta, Cliente)
        consulta = consulta.order_by(Cliente.created_at, Cliente.id).limit(MAX_PARECIDOS)
        return list(await sesion.scalars(consulta))

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        buscar: str | None,
        etiquetas: list[str],
        segmento: SegmentoCliente | None,
        asesor_id: uuid.UUID | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Cliente], int]:
        """Página ordenada por nombre y el total que cumple los filtros. `buscar` mira el nombre
        y el contacto sin distinguir mayúsculas, tildes ni espacios de más; el cliente tiene que
        tener **todas** las `etiquetas`; `asesor_id` deja solo los asignados a ese `Usuario`."""
        consulta = visibilidad.aplicar(select(Cliente), Cliente)
        if buscar:
            patron = f"%{escapar_like(normalizar(buscar))}%"
            consulta = consulta.where(
                or_(
                    nombre_normalizado(Cliente.nombre).like(patron, escape="\\"),
                    nombre_normalizado(Cliente.contacto).like(patron, escape="\\"),
                )
            )
        if etiquetas:
            for etiqueta in etiquetas:
                consulta = consulta.where(_tiene_etiqueta(normalizar(etiqueta)))
        if segmento is not None:
            consulta = consulta.where(Cliente.segmento == segmento)
        if asesor_id is not None:
            consulta = consulta.where(Cliente.asesor_asignado_id == asesor_id)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(nombre_normalizado(Cliente.nombre), Cliente.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

    async def etiquetas_en_uso(
        self, sesion: AsyncSession, *, visibilidad: Visibilidad
    ) -> list[str]:
        """Etiquetas distintas de los clientes visibles, ordenadas alfabéticamente. Las que solo
        difieren en mayúsculas, tildes o espacios son una sola (la misma clave que usa el filtro
        de `paginar`); la representa la variante más usada y, si empatan, la primera en orden."""
        desanidadas = func.unnest(Cliente.etiquetas).table_valued("etiqueta").render_derived()
        variante = espacios_colapsados(desanidadas.c.etiqueta)
        consulta = visibilidad.aplicar(
            select(variante, func.count()).select_from(Cliente).join(desanidadas, true()), Cliente
        )
        filas = await sesion.execute(consulta.group_by(variante))
        representantes: dict[str, tuple[int, str]] = {}
        for texto, usos in filas:
            clave = normalizar(texto)
            if clave:
                actual = representantes.get(clave)
                if actual is None or (-usos, texto) < (-actual[0], actual[1]):
                    representantes[clave] = (usos, texto)
        return [representantes[clave][1] for clave in sorted(representantes)]
