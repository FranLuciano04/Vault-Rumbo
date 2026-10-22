"""Rutas de usuarios (CU-25): alta, edición de rol o accesos y baja lógica."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from rumbo.presentacion.contrato import GESTION, no_implementado, operacion
from rumbo.presentacion.esquemas.usuarios import Usuario, UsuarioCrear, UsuarioEditar
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(prefix="/usuarios", tags=["seguridad"])


@router.get(
    "",
    operation_id="listar_usuarios",
    summary="Listar usuarios",
    **operacion(GESTION, "CU-25", 422),
)
async def listar_usuarios(
    pagina: Annotated[ParametrosPagina, Depends(parametros_pagina)],
    activo: bool | None = None,
) -> Pagina[Usuario]:
    """CU-25 paso 2 (RF-144): el padrón con rol y estado."""
    raise no_implementado()


@router.post(
    "",
    status_code=201,
    operation_id="crear_usuario",
    summary="Dar de alta un usuario",
    **operacion(GESTION, "CU-25", 409, 422),
)
async def crear_usuario(datos: UsuarioCrear) -> Usuario:
    """CU-25 pasos 3 a 5 (RF-144): crea el usuario y su cuenta de Firebase (DEC-0016)."""
    raise no_implementado()


@router.get(
    "/{usuario_id}",
    operation_id="obtener_usuario",
    summary="Ver un usuario",
    **operacion(GESTION, "CU-25", 404),
)
async def obtener_usuario(usuario_id: uuid.UUID) -> Usuario:
    raise no_implementado()


@router.patch(
    "/{usuario_id}",
    operation_id="editar_usuario",
    summary="Editar rol o accesos de un usuario",
    **operacion(GESTION, "CU-25", 404, 409, 422),
)
async def editar_usuario(usuario_id: uuid.UUID, datos: UsuarioEditar) -> Usuario:
    """CU-25 A2 y A4 (RF-147): no se puede quitar el rol `admin` al último admin."""
    raise no_implementado()


@router.post(
    "/{usuario_id}/baja",
    operation_id="dar_de_baja_usuario",
    summary="Dar de baja un usuario (baja lógica)",
    **operacion(GESTION, "CU-25", 404, 409),
)
async def dar_de_baja_usuario(usuario_id: uuid.UUID) -> Usuario:
    """CU-25 A3 y A4 (RF-148): desactiva al usuario; no se da de baja al último admin."""
    raise no_implementado()
