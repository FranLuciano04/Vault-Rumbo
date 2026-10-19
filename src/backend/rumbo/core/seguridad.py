"""Verificación del ID token de Firebase (DEC-0016)."""

import asyncio
import logging
import os
import uuid
from contextvars import ContextVar
from functools import lru_cache
from typing import Protocol

import firebase_admin
from firebase_admin import auth, credentials

from rumbo.core.config import Settings, get_settings
from rumbo.core.errores import ServicioExterno

logger = logging.getLogger(__name__)

# Variable que el Admin SDK lee de `os.environ`: con ella apunta al Auth Emulator y deja de
# validar la firma de los tokens, así que nunca debe llegar a producción.
VARIABLE_EMULADOR = "FIREBASE_AUTH_EMULATOR_HOST"


class EmuladorFueraDeDesarrollo(RuntimeError):
    """El Auth Emulator está configurado y `ENTORNO` no es `desarrollo`."""


class TokenInvalido(Exception):
    """El token no es válido (firma, formato, emisor) o está vencido."""


class VerificadorDeTokens(Protocol):
    async def verificar(self, token: str) -> str:
        """Devuelve el `firebase_uid` del token; lanza `TokenInvalido` si no sirve."""
        ...


usuario_auditoria: ContextVar[uuid.UUID | None] = ContextVar("usuario_auditoria", default=None)
"""Id del `Usuario` del pedido en curso; lo lee la auditoría (`created_by`/`updated_by`)."""


def _credencial(config: Settings) -> credentials.Base:
    if config.google_application_credentials:
        return credentials.Certificate(config.google_application_credentials)
    return credentials.ApplicationDefault()


def emulador_configurado(config: Settings) -> str | None:
    """Host del Auth Emulator (de `os.environ` o del `.env`), o `None` si no hay. Fuera de
    `desarrollo` lanza `EmuladorFueraDeDesarrollo`: con el emulador no se verifica la firma.

    Es el único lugar que escribe la variable en `os.environ`, donde la lee el Admin SDK.
    """
    # Si el proceso define la variable (aunque sea vacía), manda sobre el `.env`.
    host = os.environ.get(VARIABLE_EMULADOR, config.firebase_auth_emulator_host)
    if not host:
        return None
    if config.entorno != "desarrollo":
        raise EmuladorFueraDeDesarrollo(
            f"{VARIABLE_EMULADOR} está configurada con ENTORNO={config.entorno}: el Auth "
            "Emulator solo se admite con ENTORNO=desarrollo."
        )
    os.environ[VARIABLE_EMULADOR] = host
    logger.warning(
        "Firebase Auth Emulator activo (%s): los tokens no se verifican con firma.", host
    )
    return host


def _app_firebase(config: Settings) -> firebase_admin.App:
    """App por defecto del Admin SDK; la inicializa una sola vez con la config del entorno."""
    emulador_configurado(config)
    try:
        return firebase_admin.get_app()
    except ValueError:
        opciones = {"projectId": config.firebase_project_id} if config.firebase_project_id else None
        return firebase_admin.initialize_app(_credencial(config), opciones)


class VerificadorFirebase:
    """Verifica el ID token con `firebase-admin` (o con el emulador, si está configurado)."""

    def __init__(self, app: firebase_admin.App) -> None:
        self._app = app

    async def verificar(self, token: str) -> str:
        # El Admin SDK es sincrónico (baja certificados por HTTP): corre en un hilo para no
        # bloquear el event loop. Sin `check_revoked`: costaría una llamada a Firebase por
        # pedido, y la baja en Rumbo (`Usuario.activo`) ya corta el acceso al instante.
        try:
            datos = await asyncio.to_thread(auth.verify_id_token, token, app=self._app)
        except auth.InvalidIdTokenError as error:  # incluye vencido y revocado
            raise TokenInvalido("token inválido") from error
        except auth.CertificateFetchError as error:
            logger.warning("No se pudieron bajar los certificados de Firebase", exc_info=error)
            raise ServicioExterno("No se pudo verificar la sesión con Firebase.") from error
        return str(datos["uid"])


@lru_cache
def obtener_verificador() -> VerificadorDeTokens:
    """Dependencia de FastAPI: el verificador real (los tests la sobrescriben)."""
    return VerificadorFirebase(_app_firebase(get_settings()))
