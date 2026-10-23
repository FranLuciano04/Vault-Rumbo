"""T-027: alta y consulta de usuarios con su cuenta de Firebase (CU-25, RF-144, RF-145, RF-146,
RF-150, DEC-0016). Usa un gestor de cuentas falso: nunca toca Firebase."""

import uuid
from collections.abc import Awaitable, Callable

import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import ServicioExterno
from rumbo.core.seguridad import CuentaYaExiste, obtener_gestor_de_cuentas
from rumbo.datos.modelos import RolUsuario, Usuario
from tests.fabricas import UsuarioFactory, crear

RUTA = "/api/usuarios"
ROLES_SIN_ACCESO = ["empleado", "freelance"]
CuerpoAlta = dict[str, object]
ClienteComo = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"


class GestorDeCuentasFalso:
    """Cuentas de Firebase en memoria, con fallas y registro de envíos de mail."""

    def __init__(self) -> None:
        self.cuentas: dict[str, str] = {}  # email -> uid
        self.borradas: list[str] = []
        self.mails: list[str] = []
        self.falla_al_crear = False
        self.falla_al_enviar_mail = False
        self.uid_forzado: str | None = None

    async def crear_cuenta(self, email: str, nombre: str) -> str:
        if self.falla_al_crear:
            raise ServicioExterno("Firebase no responde")
        if email in self.cuentas:
            raise CuentaYaExiste(email)
        uid = self.uid_forzado or f"uid-falso-{uuid.uuid4().hex[:8]}"
        self.cuentas[email] = uid
        return uid

    async def borrar_cuenta(self, firebase_uid: str) -> None:
        self.borradas.append(firebase_uid)
        self.cuentas = {e: u for e, u in self.cuentas.items() if u != firebase_uid}

    async def enviar_mail_restablecimiento(self, email: str) -> None:
        if self.falla_al_enviar_mail:
            raise ServicioExterno("Firebase no pudo enviar el mail")
        self.mails.append(email)


@pytest.fixture
def firebase(app_de_tests: FastAPI) -> GestorDeCuentasFalso:
    gestor = GestorDeCuentasFalso()
    app_de_tests.dependency_overrides[obtener_gestor_de_cuentas] = lambda: gestor
    return gestor


def _alta(**cambios: object) -> CuerpoAlta:
    cuerpo: CuerpoAlta = {
        "nombre": "Lucía Pérez",
        "email": "lucia@agencia.test",
        "rol": "empleado",
    }
    return {**cuerpo, **cambios}


async def _usuarios_con_email(sesion: AsyncSession, email: str) -> int:
    consulta = select(func.count()).select_from(Usuario).where(Usuario.email == email)
    return int(await sesion.scalar(consulta) or 0)


@pytest.mark.parametrize("quien", ["admin", "dueno"])
async def test_rf144_alta_crea_cuenta_y_usuario(
    quien: str,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como(quien)

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["nombre"] == "Lucía Pérez"
    assert cuerpo["email"] == "lucia@agencia.test"
    assert cuerpo["rol"] == "empleado"
    assert cuerpo["activo"] is True
    assert cuerpo["acceso_redes"] is False
    assert "firebase_uid" not in cuerpo
    assert list(firebase.cuentas) == ["lucia@agencia.test"]
    guardado = await sesion.scalar(select(Usuario).where(Usuario.email == "lucia@agencia.test"))
    assert guardado is not None
    assert guardado.firebase_uid == firebase.cuentas["lucia@agencia.test"]
    assert guardado.rol == RolUsuario.empleado
    assert guardado.activo is True


async def test_rf144_alta_pide_a_firebase_el_mail_de_restablecimiento(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como("admin")

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 201, r.text
    assert firebase.mails == ["lucia@agencia.test"]


@pytest.mark.parametrize("acceso", [True, False])
async def test_rf145_alta_con_acceso_a_redes(
    acceso: bool,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como("dueno")

    r = await c.post(RUTA, json=_alta(rol="freelance", acceso_redes=acceso))

    assert r.status_code == 201, r.text
    assert r.json()["acceso_redes"] is acceso
    guardado = await sesion.scalar(select(Usuario).where(Usuario.email == "lucia@agencia.test"))
    assert guardado is not None
    assert guardado.acceso_redes is acceso
    assert guardado.rol == RolUsuario.freelance


@pytest.mark.parametrize(
    "cuerpo",
    [_alta(rol="superadmin"), _alta(email="no-es-email"), _alta(nombre="")],
)
async def test_rf144_alta_con_datos_invalidos_422_sin_crear_nada(
    cuerpo: CuerpoAlta, cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como("admin")

    r = await c.post(RUTA, json=cuerpo)

    assert r.status_code == 422
    assert firebase.cuentas == {}
    assert firebase.mails == []


async def test_rf146_email_duplicado_en_rumbo_409(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, email="lucia@agencia.test")

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 1


async def test_rf146_email_duplicado_en_firebase_409(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    firebase.cuentas["lucia@agencia.test"] = "uid-preexistente"

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {"lucia@agencia.test": "uid-preexistente"}
    assert firebase.borradas == []
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf144_falla_firebase_502_sin_usuario(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    firebase.falla_al_crear = True

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 502
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0
    assert firebase.mails == []


async def test_rf144_falla_la_base_despues_de_crear_la_cuenta_se_borra_la_cuenta(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """La base falla de verdad: la cuenta nueva devuelve un uid que ya tiene otro `Usuario`
    (`firebase_uid` es único), así que el INSERT del alta viola la restricción."""
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, firebase_uid="uid-ocupado")
    firebase.uid_forzado = "uid-ocupado"

    r = await c.post(RUTA, json=_alta())

    assert r.status_code >= 400
    assert firebase.borradas == ["uid-ocupado"]
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf144_falla_el_envio_del_mail_no_deja_el_alta_a_medias(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """Supuesto: si Firebase no puede mandar el mail, el alta falla con 502 y se compensa
    (sin Usuario ni cuenta)."""
    c = await cliente_como("admin")
    firebase.falla_al_enviar_mail = True

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 502
    assert firebase.cuentas == {}
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf144_listar_usuarios_devuelve_el_padron_paginado(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=False)

    r = await c.get(RUTA)

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert {"items", "total", "pagina", "por_pagina"} <= cuerpo.keys()
    ids = {u["id"] for u in cuerpo["items"]}
    assert {str(c.usuario.id), str(otro.id)} <= ids  # type: ignore[attr-defined]
    assert all("firebase_uid" not in u for u in cuerpo["items"])


async def test_rf144_listar_usuarios_filtra_por_activo(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    baja = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=False)

    r = await c.get(RUTA, params={"activo": "false"})

    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert [u["id"] for u in items] == [str(baja.id)]
    assert all(u["activo"] is False for u in items)


async def test_rf144_obtener_usuario_por_id(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.freelance, acceso_redes=True)

    r = await c.get(f"{RUTA}/{otro.id}")

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["id"] == str(otro.id)
    assert cuerpo["email"] == otro.email
    assert cuerpo["rol"] == "freelance"
    assert cuerpo["acceso_redes"] is True


async def test_rf144_obtener_usuario_inexistente_404(cliente_como: ClienteComo) -> None:
    c = await cliente_como("dueno")

    r = await c.get(f"{RUTA}/{uuid.uuid4()}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf150_listar_usuarios_403_para_roles_sin_gestion(
    rol: str, cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como(rol)

    r = await c.get(RUTA)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf150_obtener_usuario_403_para_roles_sin_gestion(
    rol: str, cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como(rol)

    r = await c.get(f"{RUTA}/{c.usuario.id}")  # type: ignore[attr-defined]

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf150_crear_usuario_403_para_roles_sin_gestion_sin_crear_nada(
    rol: str,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como(rol)

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0
