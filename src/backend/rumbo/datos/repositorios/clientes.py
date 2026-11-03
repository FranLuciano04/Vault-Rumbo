"""Repositorio del módulo clientes: `Cliente` (CU-02, CU-03)."""

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import ColumnElement, and_, exists, func, or_, select, true
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.contacto import clave_contacto
from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    Destino,
    EstadoAlerta,
    EstadoOportunidad,
    EstadoViaje,
    Oportunidad,
    Resena,
    SegmentoCliente,
    TipoAlerta,
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
    """Lo que suma cada fila del listado a la ficha (CU-03 paso 1): último viaje y abiertas."""

    ultimo_viaje: UltimoViaje | None = None
    oportunidades_abiertas: int = 0


@dataclass(frozen=True)
class CandidatoARecontacto:
    """Un `Cliente` fiel inactivo (CU-30) y su asesor asignado, si está activo."""

    cliente: Cliente
    asesor_activo_id: uuid.UUID | None


@dataclass(frozen=True)
class HistorialDelCliente:
    """Memoria del cliente (CU-03 paso 3): lo más reciente primero en cada lista."""

    oportunidades: list[Oportunidad]
    viajes: list[Viaje]
    resenas: list[Resena]


def _tiene_etiqueta(clave: str) -> ColumnElement[bool]:
    """El `Cliente` tiene una etiqueta cuya clave normalizada es `clave`."""
    etiqueta = func.unnest(Cliente.etiquetas).table_valued("etiqueta").render_derived().c.etiqueta
    return exists().where(nombre_normalizado(etiqueta) == clave).correlate(Cliente)


class RepositorioClientes(RepositorioBase[Cliente]):
    modelo = Cliente

    async def buscar_parecidos(
        self,
        sesion: AsyncSession,
        *,
        nombre: str | None = None,
        contacto: str | None = None,
        visibilidad: Visibilidad,
        excluir_id: uuid.UUID | None = None,
    ) -> list[Cliente]:
        """Hasta `MAX_PARECIDOS` clientes con el mismo contacto (misma clave canónica: un teléfono
        en cualquier formato, un email sin distinguir mayúsculas) o el mismo nombre (sin
        distinguir mayúsculas, tildes ni espacios de más). Solo mira los criterios que se pasan
        (al editar, los que cambian) y deja afuera a `excluir_id` (el propio cliente)."""
        criterios: list[ColumnElement[bool]] = []
        if contacto is not None:
            criterios.append(Cliente.contacto_clave == clave_contacto(contacto))
        if nombre is not None:
            criterios.append(nombre_normalizado(Cliente.nombre) == normalizar(nombre))
        if not criterios:
            return []
        consulta = visibilidad.aplicar(select(Cliente).where(or_(*criterios)), Cliente)
        if excluir_id is not None:
            consulta = consulta.where(Cliente.id != excluir_id)
        consulta = consulta.order_by(Cliente.created_at, Cliente.id).limit(MAX_PARECIDOS)
        return list(await sesion.scalars(consulta))

    async def existe_contacto(
        self, sesion: AsyncSession, *, contacto: str, excluir_id: uuid.UUID | None = None
    ) -> bool:
        """Si algún `Cliente` de la agencia (salvo `excluir_id`) tiene ese contacto (misma clave
        canónica), sin filtro de visibilidad ni filas cargadas: solo para avisar de un duplicado
        ajeno."""
        condicion = Cliente.contacto_clave == clave_contacto(contacto)
        if excluir_id is not None:
            condicion = condicion & (Cliente.id != excluir_id)
        return bool(await sesion.scalar(select(exists().where(condicion))))

    async def buscar_por_contacto(
        self, sesion: AsyncSession, *, contacto: str, asesor_id: uuid.UUID | None
    ) -> Cliente | None:
        """El `Cliente` más antiguo con ese contacto (misma clave canónica que `existe_contacto`)
        o `None`; con `asesor_id`, solo si está asignado a ese asesor. Sin filtro de visibilidad:
        solo para semillas."""
        consulta = select(Cliente).where(Cliente.contacto_clave == clave_contacto(contacto))
        if asesor_id is not None:
            consulta = consulta.where(Cliente.asesor_asignado_id == asesor_id)
        return await sesion.scalar(consulta.order_by(Cliente.created_at, Cliente.id).limit(1))

    async def bloquear_alta(self, sesion: AsyncSession, *, nombre: str, contacto: str) -> None:
        """Serializa, hasta el fin de la transacción, las altas con el mismo contacto canónico o
        el mismo nombre normalizado: quien llega segundo espera y, al re-consultar los parecidos,
        ya ve al primero. Los bloqueos se toman en orden fijo para que no se crucen."""
        claves = sorted(
            [f"cliente-contacto:{clave_contacto(contacto)}", f"cliente-nombre:{normalizar(nombre)}"]
        )
        for clave in claves:
            await sesion.execute(
                select(func.pg_advisory_xact_lock(func.hashtextextended(clave, 0)))
            )

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
        """Resumen de cada `Cliente` de `clientes` en dos consultas, sin importar cuántos sean.
        Viajes y oportunidades salen filtrados por `visibilidad` por convención, para que siga
        valiendo si cambia la regla de `politicas` (hoy, para el freelance, un cliente propio
        cuenta todo y el resultado es el mismo). El último viaje es el no cancelado de mayor
        `fecha_salida` que ya salió (`<= hoy`)."""
        ids = [c.id for c in clientes]
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
                viajes.get(c.id),
                cantidades.get(c.id, 0),
            )
            for c in clientes
        }

    async def inactivos_para_recontacto(
        self, sesion: AsyncSession, *, regreso_hasta: date
    ) -> list[CandidatoARecontacto]:
        """Candidatos a recontacto (CU-30, RF-027, RF-030), en una consulta: clientes con algún
        `Viaje` no cancelado cuyo último regreso es `<= regreso_hasta`, sin `no_recontactar`,
        sin `Oportunidad` abierta y sin una `Alerta` de `recontacto` pendiente o vista (una
        pospuesta es una pendiente con fecha futura, y también cuenta). Sin filtro de
        visibilidad: solo para el proceso diario, que no tiene actor; no exponer a un endpoint."""
        ultimo_regreso = (
            select(Viaje.cliente_id, func.max(Viaje.fecha_regreso).label("fecha"))
            .where(Viaje.estado != EstadoViaje.cancelado)
            .group_by(Viaje.cliente_id)
            .subquery()
        )
        oportunidad_abierta = exists().where(
            Oportunidad.cliente_id == Cliente.id, Oportunidad.estado.in_(_ABIERTAS)
        )
        sugerencia_abierta = exists().where(
            Alerta.cliente_id == Cliente.id,
            Alerta.tipo == TipoAlerta.recontacto,
            Alerta.estado.in_((EstadoAlerta.pendiente, EstadoAlerta.vista)),
        )
        consulta = (
            select(Cliente, Usuario.id)
            .join(ultimo_regreso, ultimo_regreso.c.cliente_id == Cliente.id)
            .outerjoin(
                Usuario, and_(Usuario.id == Cliente.asesor_asignado_id, Usuario.activo.is_(True))
            )
            .where(
                ultimo_regreso.c.fecha <= regreso_hasta,
                Cliente.no_recontactar.is_(False),
                ~oportunidad_abierta,
                ~sugerencia_abierta,
            )
            .order_by(Cliente.id)
        )
        filas = await sesion.execute(consulta)
        return [CandidatoARecontacto(cliente, asesor_id) for cliente, asesor_id in filas]

    async def historial(
        self, sesion: AsyncSession, cliente_id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> HistorialDelCliente:
        """Oportunidades (por `created_at`), viajes (por `fecha_salida`) y reseñas (por `fecha`)
        del `Cliente`, de la más reciente a la más antigua y filtradas por `visibilidad`."""

        async def traer[M](modelo: type[M], *orden: Any) -> list[M]:
            consulta = visibilidad.aplicar(
                select(modelo).where(modelo.cliente_id == cliente_id),  # type: ignore[attr-defined]
                modelo,
            )
            return list(await sesion.scalars(consulta.order_by(*orden)))

        return HistorialDelCliente(
            oportunidades=await traer(Oportunidad, Oportunidad.created_at.desc(), Oportunidad.id),
            viajes=await traer(Viaje, Viaje.fecha_salida.desc(), Viaje.id),
            resenas=await traer(Resena, Resena.fecha.desc(), Resena.id),
        )

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
