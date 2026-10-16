from collections.abc import AsyncIterator

import pytest
from fastapi import APIRouter, Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from rumbo.main import crear_app
from rumbo.negocio.errores import (
    Conflicto,
    ErrorDeDominio,
    NoEncontrado,
    ServicioExterno,
    SinPermiso,
    TransicionInvalida,
)
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

PROBLEM_JSON = "application/problem+json"


class ClienteNoEncontrado(NoEncontrado):
    pass


class Entrada(BaseModel):
    nombre: str
    monto: int


def _app_de_prueba() -> FastAPI:
    app = crear_app()
    router = APIRouter(prefix="/api/prueba")

    @router.get("/no-encontrado")
    async def no_encontrado() -> None:
        raise NoEncontrado("El cliente no existe")

    @router.get("/subclase-no-encontrado")
    async def subclase_no_encontrado() -> None:
        raise ClienteNoEncontrado("El cliente no existe")

    @router.get("/dominio-base")
    async def dominio_base() -> None:
        raise ErrorDeDominio("secreto")

    @router.get("/sin-permiso")
    async def sin_permiso() -> None:
        raise SinPermiso("No sos el responsable")

    @router.get("/transicion")
    async def transicion() -> None:
        raise TransicionInvalida("El viaje ya está cancelado")

    @router.get("/conflicto")
    async def conflicto() -> None:
        raise Conflicto("Último admin")

    @router.get("/externo")
    async def externo() -> None:
        raise ServicioExterno("La IA no respondió")

    @router.get("/explota")
    async def explota() -> None:
        raise RuntimeError("password=secreto host=db-interna")

    @router.post("/validar")
    async def validar(entrada: Entrada) -> Entrada:
        return entrada

    @router.get("/listado")
    async def listado(p: ParametrosPagina = Depends(parametros_pagina)) -> Pagina[int]:  # noqa: B008
        return Pagina[int](items=[], total=0, pagina=p.pagina, por_pagina=p.por_pagina)

    app.include_router(router)
    return app


@pytest.fixture
async def cliente() -> AsyncIterator[AsyncClient]:
    transporte = ASGITransport(app=_app_de_prueba(), raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://test") as c:
        yield c


@pytest.mark.parametrize(
    ("ruta", "estado", "detalle"),
    [
        ("no-encontrado", 404, "El cliente no existe"),
        ("sin-permiso", 403, "No sos el responsable"),
        ("transicion", 409, "El viaje ya está cancelado"),
        ("conflicto", 409, "Último admin"),
        ("externo", 502, "La IA no respondió"),
    ],
)
async def test_rnf06_excepcion_de_dominio_se_traduce_a_problem_json(
    cliente: AsyncClient, ruta: str, estado: int, detalle: str
) -> None:
    r = await cliente.get(f"/api/prueba/{ruta}")

    assert r.status_code == estado
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    cuerpo = r.json()
    assert cuerpo["status"] == estado
    assert cuerpo["detail"] == detalle
    assert isinstance(cuerpo["title"], str)
    assert cuerpo["title"]


async def test_rnf06_validacion_pydantic_devuelve_422_problem_json_con_errores_por_campo(
    cliente: AsyncClient,
) -> None:
    r = await cliente.post("/api/prueba/validar", json={"monto": "no-es-numero"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    cuerpo = r.json()
    assert cuerpo["status"] == 422
    assert cuerpo["title"]
    assert cuerpo["detail"]
    assert isinstance(cuerpo["errores"], list)
    assert len(cuerpo["errores"]) >= 2
    assert all(set(e) == {"campo", "mensaje"} for e in cuerpo["errores"])
    assert {e["campo"] for e in cuerpo["errores"]} == {"nombre", "monto"}
    assert "no-es-numero" not in r.text


async def test_rnf06_subclase_de_no_encontrado_responde_404_problem_json(
    cliente: AsyncClient,
) -> None:
    r = await cliente.get("/api/prueba/subclase-no-encontrado")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    cuerpo = r.json()
    assert cuerpo["status"] == 404
    assert cuerpo["detail"] == "El cliente no existe"


async def test_rnf12_error_de_dominio_sin_estado_responde_500_sin_filtrar_mensaje(
    cliente: AsyncClient,
) -> None:
    r = await cliente.get("/api/prueba/dominio-base")

    assert r.status_code == 500
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 500
    assert "secreto" not in r.text


async def test_rnf06_ruta_inexistente_responde_404_problem_json(cliente: AsyncClient) -> None:
    r = await cliente.get("/api/no-existe")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 404


async def test_rnf12_error_no_controlado_devuelve_500_problem_json_sin_detalles_internos(
    cliente: AsyncClient,
) -> None:
    r = await cliente.get("/api/prueba/explota")

    assert r.status_code == 500
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    cuerpo = r.json()
    assert cuerpo["status"] == 500
    assert "secreto" not in r.text
    assert "db-interna" not in r.text
    assert "RuntimeError" not in r.text
    assert "Traceback" not in r.text


async def test_rnf06_paginacion_usa_valores_por_defecto(cliente: AsyncClient) -> None:
    r = await cliente.get("/api/prueba/listado")

    assert r.status_code == 200
    cuerpo = r.json()
    assert set(cuerpo) == {"items", "total", "pagina", "por_pagina"}
    assert cuerpo["pagina"] == 1
    assert 1 <= cuerpo["por_pagina"] <= 100


@pytest.mark.parametrize(("pagina", "por_pagina"), [(1, 1), (3, 50), (1, 100)])
async def test_rnf06_paginacion_acepta_valores_limite(
    cliente: AsyncClient, pagina: int, por_pagina: int
) -> None:
    r = await cliente.get(
        "/api/prueba/listado", params={"pagina": pagina, "por_pagina": por_pagina}
    )

    assert r.status_code == 200
    assert r.json()["pagina"] == pagina
    assert r.json()["por_pagina"] == por_pagina


@pytest.mark.parametrize(
    "params",
    [
        {"pagina": 0},
        {"pagina": -1},
        {"por_pagina": 0},
        {"por_pagina": 101},
        {"pagina": "abc"},
        {"por_pagina": "abc"},
    ],
)
async def test_rnf06_paginacion_invalida_devuelve_422_problem_json(
    cliente: AsyncClient, params: dict[str, int | str]
) -> None:
    r = await cliente.get("/api/prueba/listado", params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert isinstance(r.json()["errores"], list)


def test_rnf06_desplazamiento_se_calcula_desde_pagina_y_por_pagina() -> None:
    assert ParametrosPagina(pagina=1, por_pagina=20).desplazamiento == 0
    assert ParametrosPagina(pagina=3, por_pagina=20).desplazamiento == 40
