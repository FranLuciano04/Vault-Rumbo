"""Servicio del módulo configuración (CU-13)."""

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Destino,
    Operador,
    RequisitoDestino,
    RolUsuario,
    TipoComision,
    TipoRequisito,
    Usuario,
)
from rumbo.datos.repositorios.base import RepositorioBase, RepositorioCatalogo
from rumbo.datos.repositorios.destinos import RepositorioDestinos
from rumbo.datos.repositorios.operadores import RepositorioOperadores
from rumbo.datos.repositorios.requisitos import RepositorioRequisitos
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.errores import Conflicto, NoEncontrado
from rumbo.negocio.politicas import exigir_rol, visibilidad

_destinos = RepositorioDestinos()
_operadores = RepositorioOperadores()
_requisitos = RepositorioRequisitos()
_usuarios = RepositorioUsuarios()


async def configurar_comision_por_defecto(
    sesion: AsyncSession,
    actor: Usuario,
    usuario_id: uuid.UUID,
    tipo: TipoComision | None,
    valor: Decimal | None,
) -> Usuario:
    """Fija o quita (`None` y `None`) la comisión por defecto de un vendedor (CU-13, RF-083).

    Solo la toman los viajes nuevos: cada `Viaje` guarda su propia comisión (RF-085, DEC-0007).
    La validez de tipo y valor la fijan el esquema de entrada y `usuario_comision_default_ck`.
    """
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    usuario = await _usuarios.obtener(sesion, usuario_id, visibilidad=visibilidad(actor))
    usuario.comision_default_tipo = tipo
    usuario.comision_default_valor = valor
    await sesion.flush()
    return usuario


async def listar_destinos(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    activo: bool,
    buscar: str | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Destino], int]:
    """Página del catálogo de destinos por nombre y el total (CU-26, RF-089). Lo leen todos."""
    return await _destinos.paginar(
        sesion,
        activo=activo,
        buscar=buscar,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def obtener_destino(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> Destino:
    """Un `Destino`, activo o no (CU-26). Lo leen todos."""
    return await _destinos.obtener(sesion, destino_id, visibilidad=visibilidad(actor))


async def crear_destino(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    nombre: str,
    pais: str,
    region: str | None = None,
    notas: str | None = None,
) -> Destino:
    """Da de alta un `Destino` (CU-26, RF-089, RF-090). El nombre no puede repetirse."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    await _exigir_nombre_libre(sesion, actor, _destinos, nombre)
    destino = Destino(nombre=nombre, pais=pais, region=region, notas=notas)
    sesion.add(destino)
    await _guardar_con_nombre_unico(sesion, _destinos)
    return destino


async def editar_destino(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID, cambios: dict[str, Any]
) -> Destino:
    """Aplica solo los campos enviados (CU-26, RF-090); un nombre nuevo no puede repetirse."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    destino = await obtener_destino(sesion, actor, destino_id)
    if "nombre" in cambios:
        await _exigir_nombre_libre(
            sesion, actor, _destinos, cambios["nombre"], excluir_id=destino.id
        )
    for campo, valor in cambios.items():
        setattr(destino, campo, valor)
    await _guardar_con_nombre_unico(sesion, _destinos)
    return destino


async def dar_de_baja_destino(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID
) -> Destino:
    """Baja lógica, aunque esté en uso; idempotente (CU-26, RF-091)."""
    return await _fijar_activo(sesion, actor, _destinos, destino_id, activo=False)


async def reactivar_destino(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> Destino:
    """Vuelve a dejar activo un `Destino` de baja; idempotente (CU-26, RF-092)."""
    return await _fijar_activo(sesion, actor, _destinos, destino_id, activo=True)


async def listar_requisitos(
    sesion: AsyncSession,
    actor: Usuario,
    destino_id: uuid.UUID,
    *,
    desplazamiento: int,
    limite: int,
) -> tuple[list[RequisitoDestino], int]:
    """Página de los requisitos activos de un destino (el destino puede estar de baja).

    CU-15, RF-086."""
    await obtener_destino(sesion, actor, destino_id)
    return await _requisitos.paginar_activos(
        sesion,
        destino_id,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def crear_requisito(
    sesion: AsyncSession,
    actor: Usuario,
    destino_id: uuid.UUID,
    *,
    nombre: str,
    tipo: str,
    obligatorio: bool,
    anticipacion_dias: int,
    descripcion: str | None = None,
) -> RequisitoDestino:
    """Agrega un requisito a un destino (CU-15, RF-086)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    destino = await obtener_destino(sesion, actor, destino_id)
    requisito = RequisitoDestino(
        destino_id=destino.id,
        nombre=nombre,
        tipo=TipoRequisito(tipo),
        obligatorio=obligatorio,
        descripcion=descripcion,
        anticipacion_dias=anticipacion_dias,
    )
    sesion.add(requisito)
    await sesion.flush()
    return requisito


async def editar_requisito(
    sesion: AsyncSession, actor: Usuario, requisito_id: uuid.UUID, cambios: dict[str, Any]
) -> RequisitoDestino:
    """Aplica solo los campos enviados (CU-15, RF-087). Uno de baja no se edita: es 404
    (A3). Las `Alerta` ya emitidas no se tocan: guardan su propio texto y fecha."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    requisito = await _requisitos.obtener(sesion, requisito_id, visibilidad=visibilidad(actor))
    if not requisito.activo:
        raise NoEncontrado(f"RequisitoDestino {requisito_id} no encontrado")
    if "tipo" in cambios:
        cambios = {**cambios, "tipo": TipoRequisito(cambios["tipo"])}
    for campo, valor in cambios.items():
        setattr(requisito, campo, valor)
    await sesion.flush()
    return requisito


async def dar_de_baja_requisito(
    sesion: AsyncSession, actor: Usuario, requisito_id: uuid.UUID
) -> RequisitoDestino:
    """Baja lógica; idempotente (CU-15, RF-088)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    requisito = await _requisitos.obtener(sesion, requisito_id, visibilidad=visibilidad(actor))
    if requisito.activo:
        requisito.activo = False
        await sesion.flush()
    return requisito


async def _fijar_activo[F: Destino | Operador](
    sesion: AsyncSession,
    actor: Usuario,
    repositorio: RepositorioBase[F],
    id_: uuid.UUID,
    *,
    activo: bool,
) -> F:
    """Baja o reactivación de cualquier catálogo con baja lógica; idempotente."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    fila = await repositorio.obtener(sesion, id_, visibilidad=visibilidad(actor))
    if fila.activo is not activo:
        fila.activo = activo
        await sesion.flush()
    return fila


async def _exigir_nombre_libre[F: Destino | Operador](
    sesion: AsyncSession,
    actor: Usuario,
    repositorio: RepositorioCatalogo[F],
    nombre: str,
    *,
    excluir_id: uuid.UUID | None = None,
) -> None:
    """409 si otra fila del catálogo, activa o no, ya tiene ese nombre (sin mirar el país)."""
    repetido = await repositorio.buscar_por_nombre(
        sesion, nombre, excluir_id=excluir_id, visibilidad=visibilidad(actor)
    )
    if repetido is not None:
        raise Conflicto(f"Ya existe un {repositorio.etiqueta} llamado «{repetido.nombre}».")


async def _guardar_con_nombre_unico[F: Destino | Operador](
    sesion: AsyncSession, repositorio: RepositorioCatalogo[F]
) -> None:
    """Flush que traduce el choque con el índice único del nombre a 409: cubre la carrera entre
    dos altas que pasaron `_exigir_nombre_libre` a la vez. Corre en un savepoint para que la
    sesión siga usable."""
    try:
        async with sesion.begin_nested():
            await sesion.flush()
    except IntegrityError as error:
        if repositorio.indice not in str(error.orig):
            raise
        raise Conflicto(f"Ya existe un {repositorio.etiqueta} con ese nombre.") from error


async def listar_operadores(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    activo: bool,
    buscar: str | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Operador], int]:
    """Página del catálogo de operadores por nombre y el total (CU-31, RF-093). Lo leen todos."""
    return await _operadores.paginar(
        sesion,
        activo=activo,
        buscar=buscar,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def obtener_operador(
    sesion: AsyncSession, actor: Usuario, operador_id: uuid.UUID
) -> Operador:
    """Un `Operador`, activo o no (CU-31). Lo leen todos."""
    return await _operadores.obtener(sesion, operador_id, visibilidad=visibilidad(actor))


async def crear_operador(
    sesion: AsyncSession, actor: Usuario, *, nombre: str, contacto: str | None = None
) -> Operador:
    """Da de alta un `Operador` (CU-31, RF-093, RF-094). El nombre no puede repetirse."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    await _exigir_nombre_libre(sesion, actor, _operadores, nombre)
    operador = Operador(nombre=nombre, contacto=contacto)
    sesion.add(operador)
    await _guardar_con_nombre_unico(sesion, _operadores)
    return operador


async def editar_operador(
    sesion: AsyncSession, actor: Usuario, operador_id: uuid.UUID, cambios: dict[str, Any]
) -> Operador:
    """Aplica solo los campos enviados (CU-31, RF-093); un nombre nuevo no puede repetirse."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    operador = await obtener_operador(sesion, actor, operador_id)
    if "nombre" in cambios:
        await _exigir_nombre_libre(
            sesion, actor, _operadores, cambios["nombre"], excluir_id=operador.id
        )
    for campo, valor in cambios.items():
        setattr(operador, campo, valor)
    await _guardar_con_nombre_unico(sesion, _operadores)
    return operador


async def dar_de_baja_operador(
    sesion: AsyncSession, actor: Usuario, operador_id: uuid.UUID
) -> Operador:
    """Baja lógica, aunque esté en uso; idempotente (CU-31, RF-095, DEC-0009)."""
    return await _fijar_activo(sesion, actor, _operadores, operador_id, activo=False)


async def reactivar_operador(
    sesion: AsyncSession, actor: Usuario, operador_id: uuid.UUID
) -> Operador:
    """Vuelve a dejar activo un `Operador` de baja; idempotente (CU-31, RF-096)."""
    return await _fijar_activo(sesion, actor, _operadores, operador_id, activo=True)
