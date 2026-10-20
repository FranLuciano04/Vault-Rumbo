"""Rutas del módulo seguridad (CU-24)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from rumbo.datos.modelos import Usuario
from rumbo.negocio.politicas import tiene_acceso_redes
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.comunes import Problema
from rumbo.presentacion.esquemas.seguridad import UsuarioActual

router = APIRouter(prefix="/auth", tags=["seguridad"])


@router.get(
    "/yo",
    operation_id="obtener_usuario_actual",
    summary="Usuario de la sesión, con su rol y accesos",
    description="**Roles:** admin, dueno, empleado, freelance.\n\n**Casos de uso:** CU-24.",
    responses={
        401: {
            "model": Problema,
            "description": "Falta el token, no es válido o el usuario no tiene acceso.",
        },
    },
)
async def obtener_usuario_actual(
    usuario: Annotated[Usuario, Depends(usuario_actual)],
) -> UsuarioActual:
    """CU-24 paso 3 (RF-141): el usuario de la sesión, para armar el contexto de trabajo."""
    return UsuarioActual(
        id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol.value,
        acceso_redes=tiene_acceso_redes(usuario),
    )
