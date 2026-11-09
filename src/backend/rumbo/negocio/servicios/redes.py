"""Servicio del módulo redes: tablero de contenido (CU-19) y borradores con IA (CU-20). Rumbo
nunca publica (RF-118)."""

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.ia import ModeloIA
from rumbo.datos.modelos import CanalContenido, ContenidoRed, EstadoKanban, RolUsuario, Usuario
from rumbo.datos.repositorios.contenidos import RepositorioContenidos
from rumbo.negocio.errores import SinPermiso
from rumbo.negocio.estados import contenido_red
from rumbo.negocio.politicas import exigir_rol, tiene_acceso_redes, visibilidad
from rumbo.negocio.prompts import contenido_red as prompt_contenido_red

_contenidos = RepositorioContenidos()
_LARGO_TITULO = 200  # el de `ContenidoRed.titulo`, para guardar el borrador tal cual (A2)


@dataclass(frozen=True)
class Borrador:
    """Texto propuesto por la IA; no es una pieza guardada."""

    titulo: str
    texto: str


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
    orden: Literal["asc", "desc"],
    desplazamiento: int,
    limite: int,
) -> tuple[list[ContenidoRed], int]:
    """Tablero y calendario (RF-116): por fecha de publicación, ascendente o descendente."""
    _exigir_acceso(actor)
    return await _contenidos.paginar(
        sesion,
        desde=desde,
        hasta=hasta,
        estado_kanban=estado_kanban,
        canal=canal,
        orden=orden,
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


async def proponer_contenido(
    actor: Usuario,
    modelo: ModeloIA,
    *,
    tema: str,
    canal: CanalContenido,
    tono: str | None,
) -> list[Borrador]:
    """Una llamada a la IA con solo el pedido (RF-119, RF-120, RNF-16); no persiste nada, así
    que regenerar o descartar no deja rastro (RF-122). Si la IA falla, sube `ServicioExterno`."""
    _exigir_acceso(actor)
    prompt = prompt_contenido_red.armar_prompt(tema=tema, canal=canal, tono=tono)
    texto = await modelo.generar(prompt)
    return [Borrador(titulo=tema[:_LARGO_TITULO], texto=texto)]
