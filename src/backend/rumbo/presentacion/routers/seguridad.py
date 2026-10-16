"""Rutas del módulo seguridad (CU-24). La lógica llega en el ticket de backend."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from rumbo.presentacion.dependencias import exigir_token
from rumbo.presentacion.esquemas.comunes import Problema
from rumbo.presentacion.esquemas.seguridad import UsuarioActual

router = APIRouter(prefix="/auth", tags=["seguridad"])


@router.get(
    "/yo",
    operation_id="obtener_usuario_actual",
    summary="Usuario de la sesión, con su rol y accesos",
    description="**Roles:** admin, dueno, empleado, freelance.\n\n**Casos de uso:** CU-24.",
    responses={
        401: {"model": Problema, "description": "Falta el token o no es válido."},
        501: {"model": Problema, "description": "No implementado."},
    },
)
async def obtener_usuario_actual(_: Annotated[str, Depends(exigir_token)]) -> UsuarioActual:
    raise HTTPException(status_code=501, detail="GET /auth/yo todavía no está implementado.")
