from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from rumbo.main import crear_app

PROBLEM_JSON = "application/problem+json"
RUTA = "/api/auth/yo"


@pytest.fixture
async def cliente() -> AsyncIterator[AsyncClient]:
    transporte = ASGITransport(app=crear_app(), raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://test") as c:
        yield c


@pytest.fixture
async def contrato(cliente: AsyncClient) -> dict[str, Any]:
    r = await cliente.get("/api/openapi.json")
    assert r.status_code == 200
    return r.json()


async def test_rf141_yo_sin_token_responde_401_problem_json(cliente: AsyncClient) -> None:
    r = await cliente.get(RUTA)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 401


async def test_rf141_yo_con_esquema_distinto_de_bearer_responde_401(
    cliente: AsyncClient,
) -> None:
    r = await cliente.get(RUTA, headers={"Authorization": "Basic abc"})

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf141_yo_con_token_responde_501_problem_json(cliente: AsyncClient) -> None:
    r = await cliente.get(RUTA, headers={"Authorization": "Bearer token-de-prueba"})

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    cuerpo = r.json()
    assert cuerpo["status"] == 501
    assert cuerpo["title"]


async def test_rf141_yo_no_acepta_otros_metodos(cliente: AsyncClient) -> None:
    r = await cliente.post(RUTA, headers={"Authorization": "Bearer token-de-prueba"})

    assert r.status_code == 405
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf141_contrato_publica_yo_con_seguridad_bearer_y_401(
    contrato: dict[str, Any],
) -> None:
    assert RUTA in contrato["paths"]
    operacion = contrato["paths"][RUTA]["get"]

    assert operacion["security"], "la operación debe declarar seguridad"
    esquemas_seguridad = contrato["components"]["securitySchemes"]
    nombres = [n for req in operacion["security"] for n in req]
    assert any(
        esquemas_seguridad[n]["type"] == "http" and esquemas_seguridad[n]["scheme"] == "bearer"
        for n in nombres
    )
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]


async def test_rf141_contrato_publica_esquemas_comunes_y_de_usuario(
    contrato: dict[str, Any],
) -> None:
    esquemas = contrato["components"]["schemas"]
    problema = esquemas["Problema"]

    assert {"title", "status"} <= set(problema["properties"])
    operacion = contrato["paths"][RUTA]["get"]
    assert "200" in operacion["responses"]
    ref = operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
    usuario = esquemas[ref.rsplit("/", 1)[-1]]
    assert {"email", "rol"} <= set(usuario["properties"])
    assert set(usuario["properties"]["rol"].get("enum", [])) == {
        "admin",
        "dueno",
        "empleado",
        "freelance",
    }


async def test_rf141_contrato_publica_la_pagina_generica(contrato: dict[str, Any]) -> None:
    nombres = list(contrato["components"]["schemas"])

    assert any(n.startswith("Pagina") for n in nombres)


async def test_rf141_login_y_logout_ya_no_existen(contrato: dict[str, Any]) -> None:
    assert "/api/auth/login" not in contrato["paths"]
    assert "/api/auth/logout" not in contrato["paths"]
