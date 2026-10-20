"""T-017: `datos-iniciales` crea la dueña inicial (Firebase + `Usuario`) y corre las semillas.

El Firebase es falso: nunca se toca Firebase real ni el emulador (DEC-0016).
Supuestos del ticket (a confirmar): `datos_iniciales(sesion, nombre, email, crear_cuenta, demo)`
en `rumbo.presentacion.cli`; `crear_cuenta(email, nombre) -> uid` es idempotente por email
(como `core.seguridad.crear_cuenta`); registro de semillas en `rumbo.datos.semillas.SEMILLAS`;
nombre y email por `--nombre`/`--email` o `DUENA_NOMBRE`/`DUENA_EMAIL`.
"""

import pytest
from firebase_admin.exceptions import FirebaseError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.config import Settings
from rumbo.core.errores import Conflicto
from rumbo.datos import semillas
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.presentacion import cli

NOMBRE = "Dueña de Prueba"
EMAIL = "duena@rumbo.test"


class FirebaseFalso:
    """Cuentas en memoria; igual que Firebase, un email tiene un único uid."""

    def __init__(self) -> None:
        self.uid_por_email: dict[str, str] = {}
        self.llamadas = 0

    def __call__(self, email: str, nombre: str) -> str:
        self.llamadas += 1
        email = email.lower()  # Firebase normaliza el email a minúsculas
        return self.uid_por_email.setdefault(email, f"uid-falso-{len(self.uid_por_email) + 1}")


async def _contar_usuarios(sesion: AsyncSession) -> int:
    return await sesion.scalar(select(func.count()).select_from(Usuario)) or 0


async def test_dec0015_crea_la_duena_con_su_cuenta_de_firebase(sesion: AsyncSession) -> None:
    firebase = FirebaseFalso()

    await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)

    duena = await sesion.scalar(select(Usuario).where(Usuario.email == EMAIL))
    assert duena is not None
    assert duena.nombre == NOMBRE
    assert duena.rol == RolUsuario.dueno
    assert duena.activo is True
    assert duena.firebase_uid == firebase.uid_por_email[EMAIL]


async def test_dec0015_segunda_corrida_no_duplica_usuario_ni_cuenta(sesion: AsyncSession) -> None:
    firebase = FirebaseFalso()
    await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)
    antes = await _contar_usuarios(sesion)

    await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)

    assert await _contar_usuarios(sesion) == antes
    assert len(firebase.uid_por_email) == 1
    duenas = (await sesion.scalars(select(Usuario).where(Usuario.email == EMAIL))).all()
    assert len(duenas) == 1
    assert duenas[0].firebase_uid == firebase.uid_por_email[EMAIL]


async def test_dec0015_demo_corre_las_semillas_registradas(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    corridas: list[AsyncSession] = []

    async def semilla_de_prueba(s: AsyncSession) -> None:
        corridas.append(s)

    monkeypatch.setattr(semillas, "SEMILLAS", [semilla_de_prueba])

    await cli.datos_iniciales(
        sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=FirebaseFalso(), demo=True
    )

    assert corridas == [sesion]


async def test_dec0015_sin_demo_no_corre_las_semillas(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    corridas: list[AsyncSession] = []

    async def semilla_de_prueba(s: AsyncSession) -> None:
        corridas.append(s)

    monkeypatch.setattr(semillas, "SEMILLAS", [semilla_de_prueba])

    await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=FirebaseFalso())

    assert corridas == []


async def test_dec0015_demo_sin_semillas_registradas_en_m0_no_falla(sesion: AsyncSession) -> None:
    assert semillas.SEMILLAS == []

    duena = await cli.datos_iniciales(
        sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=FirebaseFalso(), demo=True
    )

    assert duena.email == EMAIL


def test_dec0015_sin_configuracion_de_firebase_el_error_es_claro(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("FIREBASE_AUTH_EMULATOR_HOST", raising=False)
    sin_firebase = Settings(
        _env_file=None,  # type: ignore[call-arg]
        database_url="postgresql+asyncpg://u:p@localhost:5432/x",
    )
    monkeypatch.setattr(cli, "get_settings", lambda: sin_firebase)

    with pytest.raises(SystemExit) as error:
        cli.main(["datos-iniciales", "--nombre", NOMBRE, "--email", EMAIL])

    assert error.value.code not in (0, None)
    assert "FIREBASE_PROJECT_ID" in str(error.value.code)


def test_dec0015_sin_nombre_ni_email_el_error_los_nombra(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DUENA_NOMBRE", raising=False)
    monkeypatch.delenv("DUENA_EMAIL", raising=False)

    with pytest.raises(SystemExit) as error:
        cli.main(["datos-iniciales"])

    assert error.value.code not in (0, None)
    mensaje = str(error.value.code)
    assert "DUENA_NOMBRE" in mensaje
    assert "DUENA_EMAIL" in mensaje


async def test_dec0015_si_el_uid_de_firebase_cambio_se_actualiza_el_usuario(
    sesion: AsyncSession,
) -> None:
    firebase = FirebaseFalso()
    await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)
    firebase.uid_por_email[EMAIL] = "uid-nuevo"

    duena = await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)

    assert duena.firebase_uid == "uid-nuevo"
    assert await _contar_usuarios(sesion) == 1


@pytest.mark.parametrize("cambio", [{"rol": RolUsuario.admin}, {"activo": False}])
async def test_dec0015_un_usuario_existente_que_no_es_la_duena_activa_corta_sin_tocarlo(
    sesion: AsyncSession, cambio: dict[str, object]
) -> None:
    firebase = FirebaseFalso()
    duena = await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)
    for campo, valor in cambio.items():
        setattr(duena, campo, valor)
    await sesion.flush()

    with pytest.raises(Conflicto):
        await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)

    for campo, valor in cambio.items():
        assert getattr(duena, campo) == valor


async def test_dec0015_el_email_con_otras_mayusculas_no_duplica(sesion: AsyncSession) -> None:
    firebase = FirebaseFalso()
    await cli.datos_iniciales(sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase)

    duena = await cli.datos_iniciales(
        sesion, nombre=NOMBRE, email=f"  {EMAIL.upper()} ", crear_cuenta=firebase
    )

    assert duena.email == EMAIL
    assert await _contar_usuarios(sesion) == 1


async def test_dec0015_informa_si_creo_la_duena_o_ya_existia(sesion: AsyncSession) -> None:
    mensajes: list[str] = []
    firebase = FirebaseFalso()

    for _ in range(2):
        await cli.datos_iniciales(
            sesion, nombre=NOMBRE, email=EMAIL, crear_cuenta=firebase, informar=mensajes.append
        )

    assert "creada" in mensajes[0]
    assert "ya existía" in mensajes[1]
    assert "uid-falso-1" in mensajes[1]


def test_dec0016_un_error_de_firebase_sale_como_mensaje_claro(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def falla(*_: object) -> None:
        raise FirebaseError("unavailable", "Firebase no responde")

    con_firebase = Settings(
        _env_file=None,  # type: ignore[call-arg]
        database_url="postgresql+asyncpg://u:p@localhost:5432/x",
        firebase_project_id="demo-rumbo",
    )
    monkeypatch.setattr(cli, "get_settings", lambda: con_firebase)
    monkeypatch.setattr(cli, "_correr_datos_iniciales", falla)

    with pytest.raises(SystemExit) as error:
        cli.main(["datos-iniciales", "--nombre", NOMBRE, "--email", EMAIL])

    assert "Firebase no responde" in str(error.value.code)
