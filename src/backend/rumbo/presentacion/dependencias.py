"""Dependencias de FastAPI compartidas por los routers."""

from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from rumbo.core.db import SesionDep
from rumbo.core.seguridad import VerificadorDeTokens, obtener_verificador
from rumbo.datos.modelos import Usuario

_esquema_bearer = HTTPBearer(auto_error=False, description="ID token de Firebase (DEC-0016)")


async def exigir_token(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_esquema_bearer)],
) -> str:
    """Devuelve el token Bearer del pedido; sin él (o con otro esquema) responde 401."""
    if credenciales is None:
        raise HTTPException(
            status_code=401,
            detail="Falta el token Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credenciales.credentials


async def usuario_actual(
    token: Annotated[str, Depends(exigir_token)],
    verificador: Annotated[VerificadorDeTokens, Depends(obtener_verificador)],
    sesion: SesionDep,
) -> Usuario:
    """Stub del rojo de T-010: verifica el token y devuelve al `Usuario` activo."""
    raise NotImplementedError
