"""T-010: el ID token de Firebase resuelve al `Usuario` actual (CU-24, RF-140, RF-142)."""

import logging
from collections.abc import Awaitable, Callable
from typing import Annotated

import httpx
import pytest
from fastapi import APIRouter, Depends, FastAPI
from firebase_admin import auth
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.seguridad import VerificadorFirebase, obtener_verificador, usuario_auditoria
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.presentacion.dependencias import usuario_actual
from tests.conftest import VerificadorFalso
from tests.fabricas import UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
RUTA = "/api/_sonda"
ROLES = ["admin", "dueno", "empleado", "freelance"]


@pytest.fixture
def sonda(app_de_tests: FastAPI) -> None:
    """Ruta mínima que usa `usuario_actual` (`/auth/yo` es de T-015 y sigue en 501)."""
    router = APIRouter()

    @router.get(RUTA)
    async def _sonda(usuario: Annotated[Usuario, Depends(usuario_actual)]) -> dict[str, str | None]:
        contexto = usuario_auditoria.get()
        return {
            "id": str(usuario.id),
            "firebase_uid": usuario.firebase_uid,
            "rol": usuario.rol.value,
            "contexto": str(contexto) if contexto else None,
        }

    app_de_tests.include_router(router)


def _es_401(r: httpx.Response) -> None:
    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 401


@pytest.mark.usefixtures("sonda")
@pytest.mark.parametrize("rol", ROLES)
async def test_rf140_token_valido_resuelve_usuario(
    cliente_como: Callable[[str], Awaitable[AsyncClient]], rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.get(RUTA)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert cuerpo["firebase_uid"] == c.usuario.firebase_uid  # type: ignore[attr-defined]
    assert cuerpo["rol"] == rol


@pytest.mark.usefixtures("sonda")
async def test_rf140_usuario_queda_en_la_contextvar_de_auditoria(
    cliente_como: Callable[[str], Awaitable[AsyncClient]],
) -> None:
    c = await cliente_como("empleado")

    r = await c.get(RUTA)

    assert r.status_code == 200
    assert r.json()["contexto"] == str(c.usuario.id)  # type: ignore[attr-defined]


async def test_rf140_fuera_de_un_pedido_la_contextvar_esta_vacia() -> None:
    assert usuario_auditoria.get() is None


@pytest.mark.usefixtures("sonda")
async def test_rf142_sin_token_401(cliente_sin_sesion: AsyncClient) -> None:
    _es_401(await cliente_sin_sesion.get(RUTA))


@pytest.mark.usefixtures("sonda")
@pytest.mark.parametrize(
    "cabecera",
    ["abc123", "Bearer", "Bearer ", "Basic abc123", "Token abc123"],
)
async def test_rf142_authorization_mal_formado_401(
    cliente_sin_sesion: AsyncClient, cabecera: str
) -> None:
    _es_401(await cliente_sin_sesion.get(RUTA, headers={"Authorization": cabecera}))


@pytest.mark.usefixtures("sonda")
async def test_rf142_token_invalido_401(cliente_sin_sesion: AsyncClient) -> None:
    r = await cliente_sin_sesion.get(RUTA, headers={"Authorization": "Bearer basura"})

    _es_401(r)


@pytest.mark.usefixtures("sonda")
async def test_rf142_token_vencido_401(
    cliente_como: Callable[[str], Awaitable[AsyncClient]],
    verificador_falso: VerificadorFalso,
) -> None:
    c = await cliente_como("admin")
    verificador_falso.vencer(c.headers["Authorization"].removeprefix("Bearer "))

    _es_401(await c.get(RUTA))


@pytest.mark.usefixtures("sonda")
async def test_rf142_usuario_inactivo_401(
    cliente_sin_sesion: AsyncClient,
    sesion: AsyncSession,
    verificador_falso: VerificadorFalso,
) -> None:
    baja = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=False)
    token = verificador_falso.emitir(baja.firebase_uid)

    _es_401(await cliente_sin_sesion.get(RUTA, headers={"Authorization": f"Bearer {token}"}))


@pytest.mark.usefixtures("sonda")
async def test_rf142_baja_corta_el_acceso_en_el_pedido_siguiente(
    cliente_como: Callable[[str], Awaitable[AsyncClient]], sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    assert (await c.get(RUTA)).status_code == 200

    c.usuario.activo = False  # type: ignore[attr-defined]
    await sesion.flush()

    _es_401(await c.get(RUTA))


@pytest.mark.usefixtures("sonda")
async def test_rf142_uid_desconocido_401(
    cliente_sin_sesion: AsyncClient, verificador_falso: VerificadorFalso
) -> None:
    token = verificador_falso.emitir("uid-que-no-existe-en-rumbo")

    _es_401(await cliente_sin_sesion.get(RUTA, headers={"Authorization": f"Bearer {token}"}))


@pytest.mark.usefixtures("sonda")
async def test_rf142_rechazo_no_deja_usuario_en_la_contextvar(
    cliente_como: Callable[[str], Awaitable[AsyncClient]],
) -> None:
    # ASGITransport corre la app en la tarea del test: sin el reset por pedido, el id del
    # pedido válido seguiría en la contextvar al hacer el siguiente.
    admin = await cliente_como("admin")
    empleado = await cliente_como("empleado")

    valido = await admin.get(RUTA)
    assert valido.json()["contexto"] == str(admin.usuario.id)  # type: ignore[attr-defined]
    assert usuario_auditoria.get() is None

    _es_401(await admin.get(RUTA, headers={"Authorization": "Bearer basura"}))
    assert usuario_auditoria.get() is None

    otro = await empleado.get(RUTA)
    assert otro.json()["contexto"] == str(empleado.usuario.id)  # type: ignore[attr-defined]
    assert usuario_auditoria.get() is None


@pytest.mark.usefixtures("sonda")
async def test_rf142_falla_de_certificados_de_firebase_502_sin_detalle(
    app_de_tests: FastAPI,
    cliente_sin_sesion: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _sin_certificados(*_: object, **__: object) -> dict[str, str]:
        raise auth.CertificateFetchError("detalle-interno-de-firebase", cause=None)

    monkeypatch.setattr(auth, "verify_id_token", _sin_certificados)
    app_de_tests.dependency_overrides[obtener_verificador] = lambda: VerificadorFirebase(
        app=object()
    )

    r = await cliente_sin_sesion.get(RUTA, headers={"Authorization": "Bearer cualquiera"})

    assert r.status_code == 502
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "detalle-interno-de-firebase" not in r.text


@pytest.mark.usefixtures("sonda")
async def test_rf142_sin_proyecto_firebase_error_controlado(
    app_de_tests: FastAPI,
    cliente_sin_sesion: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def _sin_proyecto(*_: object, **__: object) -> dict[str, str]:
        raise ValueError("detalle-interno: Failed to determine project ID")

    monkeypatch.setattr(auth, "verify_id_token", _sin_proyecto)
    app_de_tests.dependency_overrides[obtener_verificador] = lambda: VerificadorFirebase(
        app=object()
    )

    with caplog.at_level(logging.ERROR):
        r = await cliente_sin_sesion.get(RUTA, headers={"Authorization": "Bearer cualquiera"})

    assert r.status_code == 502
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 502
    assert "detalle-interno" not in r.text
    assert "project ID" not in r.text
    assert "FIREBASE_PROJECT_ID" in caplog.text


@pytest.mark.usefixtures("sonda")
async def test_rf142_token_invalido_con_proyecto_configurado_sigue_dando_401(
    app_de_tests: FastAPI,
    cliente_sin_sesion: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _rechaza(*_: object, **__: object) -> dict[str, str]:
        raise auth.InvalidIdTokenError("firma inválida")

    monkeypatch.setattr(auth, "verify_id_token", _rechaza)
    app_de_tests.dependency_overrides[obtener_verificador] = lambda: VerificadorFirebase(
        app=object()
    )

    r = await cliente_sin_sesion.get(RUTA, headers={"Authorization": "Bearer basura"})

    _es_401(r)


# --- T-016: GET /api/auth/yo (CU-24 paso 3, RF-141) ---------------------------------------

RUTA_YO = "/api/auth/yo"


@pytest.mark.parametrize("rol", ROLES)
async def test_rf141_yo_devuelve_rol_y_accesos(
    cliente_como: Callable[[str], Awaitable[AsyncClient]], rol: str
) -> None:
    c = await cliente_como(rol)
    usuario = c.usuario  # type: ignore[attr-defined]

    r = await c.get(RUTA_YO)

    assert r.status_code == 200
    assert r.json() == {
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": rol,
        "acceso_redes": rol in ("admin", "dueno"),
    }


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf141_admin_tiene_acceso_a_redes(
    cliente_como: Callable[[str], Awaitable[AsyncClient]], sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    c.usuario.acceso_redes = False  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.get(RUTA_YO)

    assert r.status_code == 200
    assert r.json()["acceso_redes"] is True


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
@pytest.mark.parametrize("columna", [True, False])
async def test_rf141_acceso_a_redes_de_empleado_y_freelance_sale_de_la_columna(
    cliente_como: Callable[[str], Awaitable[AsyncClient]],
    sesion: AsyncSession,
    rol: str,
    columna: bool,
) -> None:
    c = await cliente_como(rol)
    c.usuario.acceso_redes = columna  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.get(RUTA_YO)

    assert r.status_code == 200
    assert r.json()["acceso_redes"] is columna


async def test_rf142_inactivo_401(
    cliente_sin_sesion: AsyncClient,
    sesion: AsyncSession,
    verificador_falso: VerificadorFalso,
) -> None:
    baja = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=False)
    token = verificador_falso.emitir(baja.firebase_uid)

    _es_401(await cliente_sin_sesion.get(RUTA_YO, headers={"Authorization": f"Bearer {token}"}))


async def test_rf142_yo_sin_token_401(cliente_sin_sesion: AsyncClient) -> None:
    _es_401(await cliente_sin_sesion.get(RUTA_YO))
