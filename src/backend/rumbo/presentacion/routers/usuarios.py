"""Rutas de usuarios (CU-25): alta, edición de rol o accesos y baja lógica."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from rumbo.core.db import SesionDep
from rumbo.core.seguridad import GestorDeCuentas, obtener_gestor_de_cuentas
from rumbo.datos import modelos
from rumbo.negocio.servicios import seguridad
from rumbo.presentacion.contrato import GESTION, operacion
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.usuarios import Usuario, UsuarioCrear, UsuarioEditar
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(prefix="/usuarios", tags=["seguridad"])

ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]
GestorDep = Annotated[GestorDeCuentas, Depends(obtener_gestor_de_cuentas)]


@router.get(
    "",
    operation_id="listar_usuarios",
    summary="Listar usuarios",
    **operacion(GESTION, "CU-25", 422),
)
async def listar_usuarios(
    pagina: Annotated[ParametrosPagina, Depends(parametros_pagina)],
    actor: ActorDep,
    sesion: SesionDep,
    activo: bool | None = None,
) -> Pagina[Usuario]:
    """CU-25 paso 2 (RF-144): el padrón con rol y estado; sin `activo` trae altas y bajas."""
    items, total = await seguridad.listar_usuarios(
        sesion,
        actor,
        activo=activo,
        desplazamiento=pagina.desplazamiento,
        limite=pagina.por_pagina,
    )
    return Pagina(
        items=[Usuario.model_validate(u) for u in items],
        total=total,
        pagina=pagina.pagina,
        por_pagina=pagina.por_pagina,
    )


@router.post(
    "",
    status_code=201,
    operation_id="crear_usuario",
    summary="Dar de alta un usuario",
    **operacion(GESTION, "CU-25", 409, 422),
)
async def crear_usuario(
    datos: UsuarioCrear,
    actor: ActorDep,
    sesion: SesionDep,
    gestor: GestorDep,
) -> Usuario:
    """CU-25 pasos 3 a 5 (RF-144): crea el usuario y su cuenta de Firebase, y Firebase le manda
    el mail para elegir la contraseña (DEC-0016). Si Firebase falla responde 502."""
    usuario = await seguridad.crear_usuario(
        sesion,
        actor,
        gestor,
        nombre=datos.nombre,
        email=datos.email,
        rol=modelos.RolUsuario(datos.rol),
        acceso_redes=datos.acceso_redes,
    )
    return Usuario.model_validate(usuario)


@router.get(
    "/{usuario_id}",
    operation_id="obtener_usuario",
    summary="Ver un usuario",
    **operacion(GESTION, "CU-25", 404),
)
async def obtener_usuario(usuario_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Usuario:
    return Usuario.model_validate(await seguridad.obtener_usuario(sesion, actor, usuario_id))


@router.patch(
    "/{usuario_id}",
    operation_id="editar_usuario",
    summary="Editar rol o accesos de un usuario",
    **operacion(GESTION, "CU-25", 404, 409, 422),
)
async def editar_usuario(
    usuario_id: uuid.UUID, datos: UsuarioEditar, actor: ActorDep, sesion: SesionDep
) -> Usuario:
    """CU-25 A2 y A4 (RF-147, RF-149): corrige nombre, rol o acceso a redes. No se le quita el
    rol `admin` al último admin activo (409); asignar o quitar `dueno` es solo de la dueña."""
    cambios = datos.model_dump(exclude_unset=True)
    usuario = await seguridad.editar_usuario(sesion, actor, usuario_id, cambios)
    return Usuario.model_validate(usuario)


@router.post(
    "/{usuario_id}/baja",
    operation_id="dar_de_baja_usuario",
    summary="Dar de baja un usuario (baja lógica)",
    **operacion(GESTION, "CU-25", 404, 409),
)
async def dar_de_baja_usuario(
    usuario_id: uuid.UUID,
    actor: ActorDep,
    sesion: SesionDep,
    gestor: GestorDep,
) -> Usuario:
    """CU-25 A3 y A4 (RF-148, RF-149): desactiva al usuario y deshabilita su cuenta de
    Firebase; no se da de baja al último admin activo (409). Si Firebase falla responde 502."""
    usuario = await seguridad.dar_de_baja_usuario(sesion, actor, gestor, usuario_id)
    return Usuario.model_validate(usuario)
