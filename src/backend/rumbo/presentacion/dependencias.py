"""Dependencias de FastAPI compartidas por los routers."""

from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
