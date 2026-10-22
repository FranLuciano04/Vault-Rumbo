"""T-149: usuario de Instagram del cliente (RF-001, RF-002; DEC-0017).

Dato extra opcional: NO cuenta como contacto mínimo. Se normaliza (sin `@` inicial, sin
espacios alrededor, en minúsculas) y debe cumplir `^[a-z0-9._]{1,30}$`. Vacío o solo `@` → null.
"""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente

PROBLEM_JSON = "application/problem+json"
CUERPO = {"nombre": "Ana Pérez", "contacto": "ana@mail.test", "segmento": "pareja"}
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Cliente))).scalar_one()


async def test_rf001_alta_con_instagram_opcional(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "instagram": "viajes.ana"})

    assert r.status_code == 201
    assert r.json()["instagram"] == "viajes.ana"
    guardado = (await sesion.execute(select(Cliente))).scalar_one()
    assert getattr(guardado, "instagram", "<sin columna>") == "viajes.ana"


async def test_rf001_alta_sin_instagram_lo_deja_en_null(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 201
    assert "instagram" in r.json()
    assert r.json()["instagram"] is None


@pytest.mark.parametrize("crudo", ["", "   ", "@", " @ "])
async def test_rf001_instagram_vacio_o_solo_arroba_se_guarda_null(
    cliente_como: FabricaCliente, crudo: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "instagram": crudo})

    assert r.status_code == 201
    assert "instagram" in r.json()
    assert r.json()["instagram"] is None


@pytest.mark.parametrize(
    ("crudo", "esperado"),
    [
        ("@Viajes.Ana", "viajes.ana"),
        ("  ana_01 ", "ana_01"),
        ("  @Ana_01  ", "ana_01"),
        ("a" * 30, "a" * 30),
    ],
)
async def test_rf001_instagram_se_normaliza(
    cliente_como: FabricaCliente, crudo: str, esperado: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "instagram": crudo})

    assert r.status_code == 201
    assert r.json()["instagram"] == esperado


@pytest.mark.parametrize(
    "crudo",
    ["viajes ana", "ana-01", "ana!", "ñandú", "@@ana", "ana@mail.test", "a" * 31],
)
async def test_rf001_instagram_con_formato_invalido_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, crudo: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "instagram": crudo})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


@pytest.mark.parametrize("extra", [{}, {"instagram": "ana_01"}, {"instagram": None}])
async def test_rf002_instagram_no_cuenta_como_contacto_minimo(
    cliente_como: FabricaCliente, sesion: AsyncSession, extra: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    cuerpo = {"nombre": "Ana Pérez", "segmento": "pareja", **extra}

    r = await c.post("/api/clientes", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf002_instagram_con_contacto_vacio_sigue_siendo_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "contacto": "", "instagram": "ana_01"})

    assert r.status_code == 422
    assert await _cantidad(sesion) == 0


# --- Contrato (openapi) ---------------------------------------------------------------


@pytest.fixture
async def contrato(cliente_sin_sesion: AsyncClient) -> dict[str, Any]:
    r = await cliente_sin_sesion.get("/api/openapi.json")
    assert r.status_code == 200
    return r.json()


@pytest.mark.parametrize("esquema", ["Cliente", "ClienteCrear", "ClienteEditar"])
async def test_rf001_contrato_publica_instagram_opcional_y_anulable(
    contrato: dict[str, Any], esquema: str
) -> None:
    definicion = contrato["components"]["schemas"][esquema]

    propiedad = definicion["properties"].get("instagram")
    assert propiedad is not None, f"{esquema} no publica `instagram`"
    assert "instagram" not in definicion.get("required", [])
    tipos = [t.get("type") for t in propiedad.get("anyOf", [])] + [propiedad.get("type")]
    assert "string" in tipos
    assert "null" in tipos
