"""T-031 (fix de la review): búsqueda sin tildes, escape del LIKE y unicidad del nombre en la
base (RF-089, RF-090)."""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Destino, RolUsuario
from rumbo.negocio.errores import Conflicto
from rumbo.negocio.servicios import configuracion
from tests.fabricas import DestinoFactory, UsuarioFactory, crear

Fabrica = Callable[[str], Awaitable[AsyncClient]]


async def _nombres(c: AsyncClient, buscar: str) -> list[str]:
    r = await c.get("/api/destinos", params={"buscar": buscar})
    assert r.status_code == 200
    return [d["nombre"] for d in r.json()["items"]]


async def test_rf089_buscar_ignora_tildes(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    await crear(sesion, DestinoFactory, nombre="Cancún", pais="México", activo=True)
    c = await cliente_como("empleado")

    assert await _nombres(c, "cancun") == ["Cancún"]
    assert await _nombres(c, "MEXICO") == ["Cancún"]


async def test_rf089_buscar_escapa_los_comodines_del_like(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await crear(sesion, DestinoFactory, nombre="A_B", activo=True)
    await crear(sesion, DestinoFactory, nombre="AxB", activo=True)
    c = await cliente_como("empleado")

    assert await _nombres(c, "_") == ["A_B"]
    assert await _nombres(c, "%") == []


async def test_rf090_la_base_rechaza_dos_destinos_con_nombres_equivalentes(
    sesion: AsyncSession,
) -> None:
    sesion.add(Destino(nombre="Cancún", pais="México"))
    await sesion.flush()

    sesion.add(Destino(nombre="  CANCUN ", pais="Otro"))
    with pytest.raises(IntegrityError):
        await sesion.flush()


async def test_rf090_el_choque_con_el_indice_se_traduce_a_conflicto(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Simula la carrera: el chequeo previo no ve al otro alta, la base sí."""
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)
    await configuracion.crear_destino(sesion, actor, nombre="Cancún", pais="México")

    async def sin_choque(*_: object, **__: object) -> None:
        return None

    monkeypatch.setattr(configuracion, "_exigir_nombre_libre", sin_choque)

    with pytest.raises(Conflicto):
        await configuracion.crear_destino(sesion, actor, nombre="cancun", pais="México")
