"""Verificación del ID token y gestión de cuentas de Firebase (DEC-0016)."""

import asyncio
import logging
import os
import uuid
from contextvars import ContextVar
from functools import lru_cache
from typing import Protocol

import firebase_admin
import requests
from firebase_admin import auth, credentials, exceptions
from google.auth.credentials import Credentials as GoogleCredentials
from google.auth.exceptions import DefaultCredentialsError
from google.auth.transport.requests import AuthorizedSession
from google.oauth2.credentials import Credentials as OAuthCredentials

from rumbo.core.config import Settings, get_settings
from rumbo.core.errores import ServicioExterno

logger = logging.getLogger(__name__)

# Variable que el Admin SDK lee de `os.environ`: con ella apunta al Auth Emulator y deja de
# validar la firma de los tokens, así que nunca debe llegar a producción.
VARIABLE_EMULADOR = "FIREBASE_AUTH_EMULATOR_HOST"

_RUTA_ENVIAR_CODIGO = "identitytoolkit.googleapis.com/v1/accounts:sendOobCode"
_TIMEOUT_SEGUNDOS = 10


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
        # Sin `httpTimeout` el Admin SDK espera hasta 120 s; la baja llama a Firebase con filas
        # de `Usuario` bloqueadas, así que se corta antes.
        opciones: dict[str, object] = {"httpTimeout": _TIMEOUT_SEGUNDOS}
        if config.firebase_project_id:
            opciones["projectId"] = config.firebase_project_id
        return firebase_admin.initialize_app(_credencial(config), opciones)


class VerificadorFirebase:
    """Verifica el ID token con `firebase-admin` (o con el emulador, si está configurado)."""

    def __init__(self, app: firebase_admin.App) -> None:
        self._app = app

    async def verificar(self, token: str) -> str:
        # El Admin SDK es sincrónico (baja certificados por HTTP): corre en un hilo para no
        # bloquear el event loop. Sin `check_revoked` (DEC-0018): costaría una llamada a Firebase
        # por pedido. Un token revocado en Firebase sigue valiendo hasta que vence (≤ 1 h, ventana
        # aceptada); la baja en Rumbo (`Usuario.activo`) corta el acceso en el pedido siguiente.
        try:
            datos = await asyncio.to_thread(auth.verify_id_token, token, app=self._app)
        except auth.InvalidIdTokenError as error:
            # Malformado, firma inválida, de otro proyecto o vencido.
            raise TokenInvalido("token inválido") from error
        except auth.CertificateFetchError as error:
            logger.warning("No se pudieron bajar los certificados de Firebase", exc_info=error)
            raise ServicioExterno("No se pudo verificar la sesión con Firebase.") from error
        except ValueError as error:  # el Admin SDK no pudo determinar el proyecto
            # Sin `exc_info`: algunos `ValueError` del Admin SDK interpolan el token.
            logger.error(
                "Falta configurar FIREBASE_PROJECT_ID (o credenciales que definan el proyecto)"
                " para verificar los tokens de Firebase (%s)",
                type(error).__name__,
            )
            raise ServicioExterno("No se pudo verificar la sesión con Firebase.") from error
        return str(datos["uid"])


def crear_cuenta(email: str, nombre: str) -> str:
    """Uid de la cuenta de Firebase de `email`; la crea si no existe (idempotente por email).

    Rumbo no maneja contraseñas (DEC-0016): la cuenta nace sin ella y la persona la define
    con «olvidé mi contraseña» o entra con Google.
    """
    app = _app_firebase(get_settings())
    try:
        return str(auth.get_user_by_email(email, app=app).uid)
    except auth.UserNotFoundError:
        return str(auth.create_user(email=email, display_name=nombre, app=app).uid)


@lru_cache
def obtener_verificador() -> VerificadorDeTokens:
    """Dependencia de FastAPI: el verificador real (los tests la sobrescriben)."""
    return VerificadorFirebase(_app_firebase(get_settings()))


class CuentaYaExiste(Exception):
    """Ya hay una cuenta de Firebase con ese email (CU-25 A1)."""


class GestorDeCuentas(Protocol):
    """Alta y baja de cuentas de Firebase y envío del mail de restablecimiento (DEC-0016)."""

    async def crear_cuenta(self, email: str, nombre: str) -> str:
        """Crea la cuenta sin contraseña y devuelve su uid. Lanza `CuentaYaExiste` si el email
        ya existe en Firebase y `ServicioExterno` si Firebase falla."""
        ...

    async def buscar_uid_por_email(self, email: str) -> str | None:
        """uid de la cuenta de Firebase con ese email, o `None` si no hay. Lanza
        `ServicioExterno` si Firebase falla."""
        ...

    async def borrar_cuenta(self, firebase_uid: str) -> None:
        """Compensación: borra la cuenta creada."""
        ...

    async def deshabilitar_cuenta(self, firebase_uid: str) -> None:
        """Deshabilita la cuenta en la baja de un `Usuario` (CU-25 A3). Lanza `ServicioExterno`
        si Firebase falla."""
        ...

    async def enviar_mail_restablecimiento(self, email: str) -> None:
        """Pide a Firebase que mande el mail para elegir la contraseña (no hay mails propios)."""
        ...


_ERRORES_FIREBASE = (exceptions.FirebaseError, ValueError, DefaultCredentialsError)


class GestorFirebase:
    """Cuentas de Firebase con el Admin SDK; el mail de restablecimiento lo manda Firebase con
    la API REST `accounts:sendOobCode`, autorizada con la misma credencial del Admin SDK.

    La app del Admin SDK se inicializa recién al usarlo: resolver la dependencia (también en
    un pedido que termina en 422) no toca Firebase."""

    def __init__(self, config: Settings) -> None:
        self._config = config

    def _app(self) -> firebase_admin.App:
        return _app_firebase(self._config)

    async def crear_cuenta(self, email: str, nombre: str) -> str:
        try:
            usuario = await asyncio.to_thread(
                auth.create_user, email=email, display_name=nombre, app=self._app()
            )
        except auth.EmailAlreadyExistsError as error:
            raise CuentaYaExiste(email) from error
        except _ERRORES_FIREBASE as error:
            logger.error("Firebase no pudo crear la cuenta (%s)", type(error).__name__)
            raise ServicioExterno("No se pudo crear la cuenta en Firebase.") from error
        return str(usuario.uid)

    async def buscar_uid_por_email(self, email: str) -> str | None:
        try:
            usuario = await asyncio.to_thread(auth.get_user_by_email, email, app=self._app())
        except auth.UserNotFoundError:
            return None
        except _ERRORES_FIREBASE as error:
            logger.error("Firebase no pudo buscar la cuenta (%s)", type(error).__name__)
            raise ServicioExterno("No se pudo buscar la cuenta en Firebase.") from error
        return str(usuario.uid)

    async def borrar_cuenta(self, firebase_uid: str) -> None:
        try:
            await asyncio.to_thread(auth.delete_user, firebase_uid, app=self._app())
        except auth.UserNotFoundError:
            return
        except _ERRORES_FIREBASE as error:
            raise ServicioExterno("No se pudo borrar la cuenta en Firebase.") from error

    async def deshabilitar_cuenta(self, firebase_uid: str) -> None:
        try:
            await asyncio.to_thread(auth.update_user, firebase_uid, disabled=True, app=self._app())
        except auth.UserNotFoundError:  # sin cuenta tampoco hay acceso: la baja sigue
            return
        except _ERRORES_FIREBASE as error:
            logger.error("Firebase no pudo deshabilitar la cuenta (%s)", type(error).__name__)
            raise ServicioExterno("No se pudo deshabilitar la cuenta en Firebase.") from error

    async def enviar_mail_restablecimiento(self, email: str) -> None:
        try:
            respuesta = await asyncio.to_thread(self._pedir_mail_restablecimiento, email)
        except (requests.RequestException, DefaultCredentialsError, ValueError) as error:
            logger.error("No se pudo pedir el mail a Firebase (%s)", type(error).__name__)
            raise ServicioExterno("Firebase no pudo enviar el mail de contraseña.") from error
        if not respuesta.ok:
            logger.error("Firebase rechazó el envío del mail (HTTP %s)", respuesta.status_code)
            raise ServicioExterno("Firebase no pudo enviar el mail de contraseña.")

    def _pedir_mail_restablecimiento(self, email: str) -> requests.Response:
        # Con credencial OAuth 2.0 se indica el proyecto en `targetProjectId` (permiso
        # `firebaseauth.users.sendEmail`), sin API key web. Fuente:
        # https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/sendOobCode
        app = self._app()  # deja escrita la variable del emulador, si corresponde
        host = os.environ.get(VARIABLE_EMULADOR)
        if host:  # El emulador acepta el token de administrador `owner`.
            url = f"http://{host}/{_RUTA_ENVIAR_CODIGO}"
            credencial: GoogleCredentials = OAuthCredentials(token="owner")  # type: ignore[no-untyped-call]  # noqa: S106
        else:
            url = f"https://{_RUTA_ENVIAR_CODIGO}"
            credencial = app.credential.get_credential()
        cuerpo = {
            "requestType": "PASSWORD_RESET",
            "email": email,
            "targetProjectId": app.project_id,
        }
        with AuthorizedSession(credencial) as sesion_http:  # type: ignore[no-untyped-call]
            return sesion_http.post(url, json=cuerpo, timeout=_TIMEOUT_SEGUNDOS)


@lru_cache
def obtener_gestor_de_cuentas() -> GestorDeCuentas:
    """Dependencia de FastAPI: el gestor real (los tests la sobrescriben)."""
    return GestorFirebase(get_settings())
