"""Repositorio del módulo clientes: `Cliente` (CU-02, CU-03)."""

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import ColumnElement, exists, func, or_, select, true
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Cliente,
    Destino,
    EstadoOportunidad,
    EstadoViaje,
    Oportunidad,
    SegmentoCliente,
    Usuario,
    Viaje,
)
from rumbo.datos.modelos.base import espacios_colapsados, nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, escapar_like, normalizar

MAX_PARECIDOS = 10
_ABIERTAS = (EstadoOportunidad.nueva, EstadoOportunidad.en_gestion, EstadoOportunidad.cotizada)


@dataclass(frozen=True)
class UltimoViaje:
    fecha_salida: date
    destino: str


@dataclass(frozen=True)
class ResumenCliente:
    """Lo que muestra cada fila del listado (CU-03 paso 1): asesor, último viaje y abiertas."""

    asesor: Usuario | None = None
    ultimo_viaje: UltimoViaje | None = None
    oportunidades_abiertas: int = 0


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

    async def existe_contacto(self, sesion: AsyncSession, *, contacto: str) -> bool:
        """Si algún `Cliente` de la agencia tiene ese contacto (sin distinguir mayúsculas), sin
        filtro de visibilidad ni filas cargadas: solo para avisar de un duplicado ajeno."""
        consulta = select(exists().where(func.lower(Cliente.contacto) == contacto.lower()))
        return bool(await sesion.scalar(consulta))

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

    async def resumir(
        self,
        sesion: AsyncSession,
        clientes: list[Cliente],
        *,
        hoy: date,
        visibilidad: Visibilidad,
    ) -> dict[uuid.UUID, ResumenCliente]:
        """Resumen de cada `Cliente` de `clientes` en tres consultas, sin importar cuántos sean.
        Viajes y oportunidades salen filtrados por `visibilidad` por convención, para que siga
        valiendo si cambia la regla de `politicas` (hoy, para el freelance, un cliente propio
        cuenta todo y el resultado es el mismo). El asesor es un dato del cliente, que el actor
        ya ve. El último viaje es el no cancelado de mayor `fecha_salida` que ya salió
        (`<= hoy`)."""
        ids = [c.id for c in clientes]
        asesores = {
            a.id: a
            for a in await sesion.scalars(
                select(Usuario).where(
                    Usuario.id.in_([c.asesor_asignado_id for c in clientes if c.asesor_asignado_id])
                )
            )
        }
        ultimos = (
            visibilidad.aplicar(select(Viaje), Viaje)
            .with_only_columns(Viaje.cliente_id, Viaje.fecha_salida, Destino.nombre)
            .ext(distinct_on(Viaje.cliente_id))
            .join(Destino, Destino.id == Viaje.destino_id)
            .where(
                Viaje.cliente_id.in_(ids),
                Viaje.estado != EstadoViaje.cancelado,
                Viaje.fecha_salida <= hoy,
            )
            .order_by(Viaje.cliente_id, Viaje.fecha_salida.desc(), Viaje.id)
        )
        abiertas = (
            visibilidad.aplicar(select(Oportunidad), Oportunidad)
            .with_only_columns(Oportunidad.cliente_id, func.count())
            .where(Oportunidad.cliente_id.in_(ids), Oportunidad.estado.in_(_ABIERTAS))
            .group_by(Oportunidad.cliente_id)
        )
        viajes = {
            cliente_id: UltimoViaje(fecha, destino)
            for cliente_id, fecha, destino in await sesion.execute(ultimos)
        }
        cantidades = dict((await sesion.execute(abiertas)).all())
        return {
            c.id: ResumenCliente(
                asesores.get(c.asesor_asignado_id) if c.asesor_asignado_id else None,
                viajes.get(c.id),
                cantidades.get(c.id, 0),
            )
            for c in clientes
        }

    async def etiquetas_en_uso(
        self, sesion: AsyncSession, *, visibilidad: Visibilidad
    ) -> list[str]:
        """Etiquetas distintas de los clientes visibles, ordenadas alfabéticamente. Las que solo
        difieren en mayúsculas, tildes o espacios son una sola (la misma clave que usa el filtro
        de `paginar`); la representa la variante más usada y, si empatan, la primera en orden."""
        desanidadas = func.unnest(Cliente.etiquetas).table_valued("etiqueta").render_derived()
        variante = espacios_colapsados(desanidadas.c.etiqueta)
        visibles = visibilidad.aplicar(select(Cliente).join(desanidadas, true()), Cliente)
        consulta = visibles.with_only_columns(variante, func.count()).group_by(variante)
        filas = await sesion.execute(consulta)
        representantes: dict[str, tuple[int, str]] = {}
        for texto, usos in filas:
            clave = normalizar(texto)
            if clave:
                actual = representantes.get(clave)
                if actual is None or (-usos, texto) < (-actual[0], actual[1]):
                    representantes[clave] = (usos, texto)
        return [representantes[clave][1] for clave in sorted(representantes)]
