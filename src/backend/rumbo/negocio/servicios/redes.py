"""Servicio del módulo redes: tablero de contenido (CU-19). Rumbo nunca publica (RF-118)."""

import uuid
from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import CanalContenido, ContenidoRed, EstadoKanban, RolUsuario, Usuario
from rumbo.datos.repositorios.contenidos import RepositorioContenidos
from rumbo.negocio.errores import SinPermiso
from rumbo.negocio.estados import contenido_red
from rumbo.negocio.politicas import exigir_rol, tiene_acceso_redes, visibilidad

_contenidos = RepositorioContenidos()


def _exigir_acceso(actor: Usuario) -> None:
    """La lectura por fila es global, así que el rol y el acceso a redes se chequean acá
    (DEC-0008, DEC-0013): el freelance nunca entra, tenga o no la capacidad."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado)
    if not tiene_acceso_redes(actor):
        raise SinPermiso("No tenés acceso al módulo de redes")


async def listar_contenidos(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    desde: date | None,
    hasta: date | None,
    estado_kanban: EstadoKanban | None,
    canal: CanalContenido | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[ContenidoRed], int]:
    """Tablero y calendario (RF-116): de la fecha de publicación más próxima a la más lejana."""
    _exigir_acceso(actor)
    return await _contenidos.paginar(
        sesion,
        desde=desde,
        hasta=hasta,
        estado_kanban=estado_kanban,
        canal=canal,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def crear_contenido(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    titulo: str,
    texto: str | None,
    canal: CanalContenido,
    fecha_publicacion: date,
) -> ContenidoRed:
    """Alta en la columna `idea` (RF-113)."""
    _exigir_acceso(actor)
    pieza = ContenidoRed(
        usuario_id=actor.id,
        titulo=titulo,
        texto=texto,
        canal=canal,
        estado_kanban=EstadoKanban.idea,
        fecha_publicacion=fecha_publicacion,
    )
    sesion.add(pieza)
    await sesion.flush()
    return pieza


async def obtener_contenido(
    sesion: AsyncSession, actor: Usuario, contenido_id: uuid.UUID
) -> ContenidoRed:
    _exigir_acceso(actor)
    return await _contenidos.obtener(sesion, contenido_id, visibilidad=visibilidad(actor))


async def editar_contenido(
    sesion: AsyncSession, actor: Usuario, contenido_id: uuid.UUID, cambios: dict[str, Any]
) -> ContenidoRed:
    """Edita, reprograma o mueve la pieza por el tablero (RF-113 a RF-115)."""
    _exigir_acceso(actor)
    pieza = await _contenidos.obtener_para_modificar(
        sesion, contenido_id, visibilidad=visibilidad(actor)
    )
    contenido_red.editar(pieza, cambios)
    await sesion.flush()
    return pieza


async def descartar_contenido(
    sesion: AsyncSession, actor: Usuario, contenido_id: uuid.UUID
) -> ContenidoRed:
    """Baja lógica (RF-117, CU-19 A4)."""
    _exigir_acceso(actor)
    pieza = await _contenidos.obtener_para_modificar(
        sesion, contenido_id, visibilidad=visibilidad(actor)
    )
    contenido_red.descartar(pieza)
    await sesion.flush()
    return pieza
