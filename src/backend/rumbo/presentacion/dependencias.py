"""Dependencias de FastAPI compartidas por los routers."""

from collections.abc import AsyncIterator, Awaitable, Callable
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
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.negocio.politicas import exigir_rol
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


async def _contexto_de_auditoria() -> AsyncIterator[None]:
    """Acota `usuario_auditoria` al pedido: al terminar vuelve al valor previo.

    Vive aparte de `usuario_actual` porque una dependencia con `yield` es de alcance
    «request» y FastAPI no la deja depender de `SesionDep` (alcance «function»). Sale después
    del commit de la sesión, así que la auditoría todavía ve al usuario al guardar.
    """
    marca = usuario_auditoria.set(None)
    try:
        yield
    finally:
        usuario_auditoria.reset(marca)


async def usuario_actual(
    _: Annotated[None, Depends(_contexto_de_auditoria)],
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


def exigir_roles(*roles: RolUsuario) -> Callable[..., Awaitable[Usuario]]:
    """Dependencia que deja pasar solo a esos roles (403 al resto, RF-150). Es dependencia de
    FastAPI para que el 401 y el 403 salgan antes que el 422 de un cuerpo con datos inválidos.
    Una excepción: si el cuerpo ni siquiera es JSON, FastAPI lo rechaza con 422 antes de resolver
    las dependencias, aun sin token o con un rol que no alcanza."""

    async def guardia(actor: Annotated[Usuario, Depends(usuario_actual)]) -> Usuario:
        exigir_rol(actor, *roles)
        return actor

    return guardia
