"""Dependencias de FastAPI compartidas por los routers."""

from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from rumbo.core.db import SesionDep
from rumbo.core.seguridad import (
    TokenInvalido,
    VerificadorDeTokens,
    obtener_verificador,
    usuario_auditoria,
)
from rumbo.datos.modelos import Usuario
from rumbo.negocio.servicios import seguridad

_esquema_bearer = HTTPBearer(auto_error=False, description="ID token de Firebase (DEC-0016)")


def _no_autenticado(detalle: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detalle, headers={"WWW-Authenticate": "Bearer"})


async def exigir_token(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_esquema_bearer)],
) -> str:
    """Devuelve el token Bearer del pedido; sin él (o con otro esquema) responde 401."""
    if credenciales is None:
        raise _no_autenticado("Falta el token Bearer.")
    return credenciales.credentials


async def usuario_actual(
    token: Annotated[str, Depends(exigir_token)],
    verificador: Annotated[VerificadorDeTokens, Depends(obtener_verificador)],
    sesion: SesionDep,
) -> Usuario:
    """`Usuario` activo dueño del ID token, que queda para la auditoría; si no, 401 (RF-140,
    RF-142). Se resuelve en cada pedido: una baja corta el acceso en el siguiente."""
    try:
        firebase_uid = await verificador.verificar(token)
    except TokenInvalido:
        raise _no_autenticado("El token no es válido o está vencido.") from None
    usuario = await seguridad.usuario_con_acceso(sesion, firebase_uid)
    if usuario is None:
        raise _no_autenticado("El usuario no tiene acceso a Rumbo.")
    usuario_auditoria.set(usuario.id)
    return usuario
