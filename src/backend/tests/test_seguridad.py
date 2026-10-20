"""T-010: verificador real de Firebase y candado del Auth Emulator (DEC-0016, RNF-03).

Nunca tocan Firebase: `auth.verify_id_token` y las credenciales se reemplazan con monkeypatch.
"""

import logging
import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace

import firebase_admin
import pytest
from firebase_admin import auth, credentials

from rumbo.core import seguridad
from rumbo.core.config import Settings
from rumbo.core.errores import ServicioExterno
from rumbo.core.seguridad import (
    VARIABLE_EMULADOR,
    EmuladorFueraDeDesarrollo,
    TokenInvalido,
    VerificadorFirebase,
    emulador_configurado,
)

RAIZ_BACKEND = Path(__file__).resolve().parent.parent
URL_BASE = "postgresql+asyncpg://u:p@localhost:5432/x"
HOST = "localhost:9099"


def _config(**valores: object) -> Settings:
    return Settings(_env_file=None, database_url=URL_BASE, **valores)  # type: ignore[call-arg]


@pytest.fixture
def sin_emulador_en_el_proceso(monkeypatch: pytest.MonkeyPatch) -> None:
    """Quita la variable y `ENTORNO` del proceso; monkeypatch restaura lo que escriba el código."""
    monkeypatch.delenv(VARIABLE_EMULADOR, raising=False)
    monkeypatch.delenv("ENTORNO", raising=False)


@pytest.fixture
def sin_apps_de_firebase() -> Iterator[None]:
    yield
    for app in list(firebase_admin._apps.values()):
        firebase_admin.delete_app(app)


# --- Candado del Auth Emulator ---------------------------------------------------------------


@pytest.mark.usefixtures("sin_emulador_en_el_proceso")
def test_rnf03_produccion_con_emulador_en_settings_falla() -> None:
    with pytest.raises(EmuladorFueraDeDesarrollo):
        emulador_configurado(_config(entorno="produccion", firebase_auth_emulator_host=HOST))

    assert VARIABLE_EMULADOR not in os.environ


@pytest.mark.usefixtures("sin_emulador_en_el_proceso")
def test_rnf03_produccion_con_emulador_en_el_proceso_falla(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = _config(entorno="produccion")
    monkeypatch.setenv(VARIABLE_EMULADOR, HOST)

    with pytest.raises(EmuladorFueraDeDesarrollo):
        emulador_configurado(config)


@pytest.mark.usefixtures("sin_emulador_en_el_proceso")
def test_rnf03_sin_entorno_se_comporta_como_produccion() -> None:
    config = _config(firebase_auth_emulator_host=HOST)

    assert config.entorno == "produccion"
    with pytest.raises(EmuladorFueraDeDesarrollo):
        emulador_configurado(config)


@pytest.mark.usefixtures("sin_emulador_en_el_proceso")
def test_rnf03_desarrollo_con_emulador_avisa_y_lo_pasa_al_sdk(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.WARNING, logger=seguridad.__name__):
        host = emulador_configurado(_config(entorno="desarrollo", firebase_auth_emulator_host=HOST))

    assert host == HOST
    assert os.environ[VARIABLE_EMULADOR] == HOST
    assert "Emulator" in caplog.text


@pytest.mark.usefixtures("sin_emulador_en_el_proceso")
def test_rnf03_sin_emulador_no_hace_nada() -> None:
    assert emulador_configurado(_config(entorno="produccion")) is None
    assert VARIABLE_EMULADOR not in os.environ


def test_rnf03_la_variable_vacia_del_proceso_manda_sobre_el_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(VARIABLE_EMULADOR, "")

    assert emulador_configurado(_config(firebase_auth_emulator_host=HOST)) is None


def _importar_la_app(tmp_path: Path, **variables: str) -> subprocess.CompletedProcess[str]:
    excluidas = {"ENTORNO", VARIABLE_EMULADOR, "FIREBASE_PROJECT_ID"}
    entorno = {k: v for k, v in os.environ.items() if k.upper() not in excluidas}
    entorno |= {"PYTHONPATH": str(RAIZ_BACKEND), "DATABASE_URL": URL_BASE, **variables}
    return subprocess.run(  # noqa: S603
        [sys.executable, "-c", "import rumbo.main"],
        cwd=tmp_path,  # sin .env
        env=entorno,
        capture_output=True,
        text=True,
        check=False,
    )


def test_rnf03_la_app_no_arranca_con_emulador_fuera_de_desarrollo(tmp_path: Path) -> None:
    resultado = _importar_la_app(tmp_path, **{VARIABLE_EMULADOR: HOST})

    assert resultado.returncode != 0
    assert "EmuladorFueraDeDesarrollo" in resultado.stderr


def test_rnf03_la_app_arranca_con_emulador_en_desarrollo(tmp_path: Path) -> None:
    resultado = _importar_la_app(tmp_path, ENTORNO="desarrollo", **{VARIABLE_EMULADOR: HOST})

    assert resultado.returncode == 0, resultado.stderr
    assert "Emulator" in resultado.stderr


# --- VerificadorFirebase ---------------------------------------------------------------------


def _verify_que_lanza(error: Exception) -> object:
    def _verify(*_: object, **__: object) -> dict[str, str]:
        raise error

    return _verify


@pytest.mark.parametrize(
    "error",
    [
        auth.InvalidIdTokenError("firma inválida"),
        auth.ExpiredIdTokenError("token vencido", cause=None),
        auth.RevokedIdTokenError("token revocado"),
    ],
)
async def test_rf142_token_rechazado_por_firebase_da_token_invalido(
    monkeypatch: pytest.MonkeyPatch, error: Exception
) -> None:
    monkeypatch.setattr(auth, "verify_id_token", _verify_que_lanza(error))

    with pytest.raises(TokenInvalido):
        await VerificadorFirebase(app=object()).verificar("token")


async def test_rf142_falla_de_certificados_da_servicio_externo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    error = auth.CertificateFetchError("sin red", cause=None)
    monkeypatch.setattr(auth, "verify_id_token", _verify_que_lanza(error))

    with pytest.raises(ServicioExterno) as capturado:
        await VerificadorFirebase(app=object()).verificar("token")

    assert "sin red" not in capturado.value.detalle


async def test_rf140_token_valido_devuelve_el_uid(monkeypatch: pytest.MonkeyPatch) -> None:
    app = object()
    llamadas: list[tuple[str, object]] = []

    def _verify(token: str, app: object = None) -> dict[str, str]:
        llamadas.append((token, app))
        return {"uid": "uid-1", "sub": "uid-1"}

    monkeypatch.setattr(auth, "verify_id_token", _verify)

    assert await VerificadorFirebase(app=app).verificar("token") == "uid-1"
    assert llamadas == [("token", app)]


@pytest.mark.usefixtures("sin_emulador_en_el_proceso", "sin_apps_de_firebase")
def test_rf140_app_firebase_es_idempotente() -> None:
    config = _config(firebase_project_id="demo-rumbo")

    primera = seguridad._app_firebase(config)
    segunda = seguridad._app_firebase(config)

    assert primera is segunda
    assert primera.project_id == "demo-rumbo"


def test_rf140_con_cuenta_de_servicio_usa_certificate(monkeypatch: pytest.MonkeyPatch) -> None:
    rutas: list[str] = []

    class _CertificadoFalso(credentials.Base):
        def __init__(self, ruta: str) -> None:
            rutas.append(ruta)

    monkeypatch.setattr(credentials, "Certificate", _CertificadoFalso)

    credencial = seguridad._credencial(_config(google_application_credentials="cuenta.json"))

    assert isinstance(credencial, _CertificadoFalso)
    assert rutas == ["cuenta.json"]


def test_rf140_sin_cuenta_de_servicio_usa_application_default() -> None:
    assert isinstance(seguridad._credencial(_config()), credentials.ApplicationDefault)


def test_rf140_obtener_verificador_esta_cacheado(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(seguridad, "_app_firebase", lambda _config: object())
    seguridad.obtener_verificador.cache_clear()
    try:
        primero = seguridad.obtener_verificador()

        assert isinstance(primero, VerificadorFirebase)
        assert seguridad.obtener_verificador() is primero
    finally:
        seguridad.obtener_verificador.cache_clear()


def test_dec0016_crear_cuenta_devuelve_el_uid_de_la_cuenta_existente(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(seguridad, "_app_firebase", lambda _config: object())
    monkeypatch.setattr(auth, "get_user_by_email", lambda email, app: SimpleNamespace(uid="u-1"))
    monkeypatch.setattr(auth, "create_user", lambda **_: pytest.fail("no debía crear"))

    assert seguridad.crear_cuenta("a@rumbo.test", "Ana") == "u-1"


def test_dec0016_crear_cuenta_la_crea_si_no_existe(monkeypatch: pytest.MonkeyPatch) -> None:
    creadas: list[dict[str, object]] = []

    def _no_existe(email: str, app: object) -> object:
        raise auth.UserNotFoundError("no existe")

    def _crear(**datos: object) -> object:
        creadas.append(datos)
        return SimpleNamespace(uid="u-2")

    monkeypatch.setattr(seguridad, "_app_firebase", lambda _config: "app")
    monkeypatch.setattr(auth, "get_user_by_email", _no_existe)
    monkeypatch.setattr(auth, "create_user", _crear)

    assert seguridad.crear_cuenta("a@rumbo.test", "Ana") == "u-2"
    assert creadas == [{"email": "a@rumbo.test", "display_name": "Ana", "app": "app"}]
