"""T-040: alta de clientes con detección de duplicados (CU-02, RF-001, RF-002, RF-003, RF-150)."""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, SegmentoCliente
from tests.fabricas import ClienteFactory, UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
ROLES = ["admin", "dueno", "empleado", "freelance"]
CUERPO = {"nombre": "Ana Pérez", "contacto": "ana@mail.test", "segmento": "pareja"}
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Cliente))).scalar_one()


@pytest.mark.parametrize("rol", ROLES)
async def test_rf001_registrar_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.post("/api/clientes", json={**CUERPO, "etiquetas": ["luna de miel"]})

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["id"]
    assert cuerpo["nombre"] == "Ana Pérez"
    assert cuerpo["contacto"] == "ana@mail.test"
    assert cuerpo["segmento"] == "pareja"
    assert cuerpo["etiquetas"] == ["luna de miel"]
    assert cuerpo["no_recontactar"] is False
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert await _cantidad(sesion) == 1


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"contacto": "ana@mail.test", "segmento": "pareja"},
        {"nombre": "Ana Pérez", "segmento": "pareja"},
        {"nombre": "Ana Pérez", "contacto": "ana@mail.test"},
        {**CUERPO, "nombre": "   "},
        {**CUERPO, "contacto": ""},
        {**CUERPO, "segmento": "otro"},
    ],
)
async def test_rf002_datos_minimos_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf003_posible_duplicado_pide_confirmacion(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        segmento=SegmentoCliente("pareja"),
    )
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1  # sin alta


async def test_rf003_duplicado_por_contacto_con_otro_nombre(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="Carlos Gómez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1


async def test_rf003_duplicado_por_nombre_con_otro_contacto(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="ana pérez", contacto="+5491155550000")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1


async def test_rf003_confirmar_duplicado_crea_el_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "confirmar_duplicado": True})

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf003_sin_parecidos_no_pide_confirmacion(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Carlos Gómez", contacto="+5491155550000")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf150_freelance_queda_asignado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)

    r = await c.post("/api/clientes", json={**CUERPO, "asesor_asignado_id": str(otro.id)})

    assert r.status_code == 201
    assert r.json()["asesor_asignado_id"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = (await sesion.execute(select(Cliente))).scalar_one()
    assert fila.asesor_asignado_id == c.usuario.id  # type: ignore[attr-defined]


async def test_rf001_asesor_inexistente_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={**CUERPO, "asesor_asignado_id": "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"},
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["errores"][0]["campo"] == "asesor_asignado_id"
    assert await _cantidad(sesion) == 0


async def test_rf001_asesor_inactivo_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    baja = await crear(sesion, UsuarioFactory, activo=False)

    r = await c.post("/api/clientes", json={**CUERPO, "asesor_asignado_id": str(baja.id)})

    assert r.status_code == 422
    assert r.json()["errores"][0]["campo"] == "asesor_asignado_id"
    assert await _cantidad(sesion) == 0


async def test_rf001_asesor_activo_queda_asignado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    asesor = await crear(sesion, UsuarioFactory)

    r = await c.post("/api/clientes", json={**CUERPO, "asesor_asignado_id": str(asesor.id)})

    assert r.status_code == 201
    assert r.json()["asesor_asignado_id"] == str(asesor.id)


async def test_rf003_freelance_no_ve_duplicados_ajenos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        asesor_asignado_id=ajeno.id,
    )
    c = await cliente_como("freelance")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 201
    assert "duplicados" not in r.json()
    assert await _cantidad(sesion) == 2


async def test_rf003_duplicado_por_nombre_sin_tildes_ni_espacios_de_mas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="ana  perez", contacto="+5491155550000")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]


async def test_rf003_el_409_trae_hasta_10_candidatos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    for _ in range(12):
        await crear(sesion, ClienteFactory, nombre="Ana Pérez")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert len(r.json()["duplicados"]) == 10
