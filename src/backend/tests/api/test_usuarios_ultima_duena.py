"""CU-25 A5: el sistema nunca queda sin una `dueno` activa (409), igual que A4 con el último
`admin` (RF-149). Quitar el rol `dueno` o dar de baja a la única dueña activa se rechaza."""

import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.seguridad import obtener_gestor_de_cuentas
from rumbo.datos.modelos import RolUsuario
from tests.api.test_usuarios import (
    PROBLEM_JSON,
    RUTA,
    ClienteComo,
    GestorDeCuentasFalso,
    _recargar,
)
from tests.fabricas import UsuarioFactory, crear


@pytest.fixture
def firebase(app_de_tests: FastAPI) -> GestorDeCuentasFalso:
    gestor = GestorDeCuentasFalso()
    app_de_tests.dependency_overrides[obtener_gestor_de_cuentas] = lambda: gestor
    return gestor


async def test_cu25_a5_ultima_duena_409_al_quitarle_el_rol(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")  # única dueña activa, se edita a sí misma

    r = await c.patch(f"{RUTA}/{c.usuario.id}", json={"rol": "admin"})  # type: ignore[attr-defined]

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, c.usuario)).rol == RolUsuario.dueno  # type: ignore[attr-defined]


async def test_cu25_a5_ultima_duena_409_al_darla_de_baja(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")

    r = await c.post(f"{RUTA}/{c.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, c.usuario)).activo is True  # type: ignore[attr-defined]
    assert firebase.deshabilitadas == []


async def test_cu25_a5_una_duena_inactiva_no_cuenta_y_la_unica_activa_sigue_protegida_409(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """Una dueña dada de baja no cuenta como dueña activa."""
    c = await cliente_como("dueno")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=False)

    r_rol = await c.patch(f"{RUTA}/{c.usuario.id}", json={"rol": "empleado"})  # type: ignore[attr-defined]
    r_baja = await c.post(f"{RUTA}/{c.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r_rol.status_code == 409
    assert r_baja.status_code == 409
    assert (await _recargar(sesion, c.usuario)).rol == RolUsuario.dueno  # type: ignore[attr-defined]
    assert firebase.deshabilitadas == []


async def test_cu25_a5_con_otra_duena_activa_se_puede_quitar_el_rol(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otra = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r = await c.patch(f"{RUTA}/{otra.id}", json={"rol": "empleado"})

    assert r.status_code == 200, r.text
    assert (await _recargar(sesion, otra)).rol == RolUsuario.empleado


async def test_cu25_a5_con_otra_duena_activa_se_puede_quitar_el_rol_a_si_misma(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r = await c.patch(f"{RUTA}/{c.usuario.id}", json={"rol": "empleado"})  # type: ignore[attr-defined]

    assert r.status_code == 200, r.text
    assert (await _recargar(sesion, c.usuario)).rol == RolUsuario.empleado  # type: ignore[attr-defined]


async def test_cu25_a5_con_otra_duena_activa_se_puede_dar_de_baja(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otra = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r = await c.post(f"{RUTA}/{otra.id}/baja")

    assert r.status_code == 200, r.text
    assert (await _recargar(sesion, otra)).activo is False
    assert firebase.deshabilitadas == [otra.firebase_uid]


async def test_cu25_a5_con_otra_duena_activa_se_puede_autobaja(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r = await c.post(f"{RUTA}/{c.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r.status_code == 200, r.text
    assert (await _recargar(sesion, c.usuario)).activo is False  # type: ignore[attr-defined]
