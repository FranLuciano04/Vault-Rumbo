from typing import get_args

from fastapi import APIRouter
from httpx import ASGITransport, AsyncClient

from rumbo.datos.modelos.enums import RolUsuario
from rumbo.main import crear_app
from rumbo.presentacion.esquemas.seguridad import Rol

PROBLEMA = {"$ref": "#/components/schemas/Problema"}


async def test_rnf06_el_422_de_una_ruta_con_parametros_apunta_a_problema() -> None:
    app = crear_app()
    router = APIRouter()

    @router.get("/api/prueba/filtrar")
    async def filtrar(q: int) -> dict[str, int]:
        return {"q": q}

    app.include_router(router)
    app.openapi_schema = None
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        contrato = (await c.get("/api/openapi.json")).json()

    respuesta = contrato["paths"]["/api/prueba/filtrar"]["get"]["responses"]["422"]
    assert respuesta["content"] == {"application/problem+json": {"schema": PROBLEMA}}
    assert "Problema" in contrato["components"]["schemas"]
    assert "HTTPValidationError" not in contrato["components"]["schemas"]
    assert "ValidationError" not in contrato["components"]["schemas"]


def test_rf141_rol_del_contrato_coincide_con_el_enum_de_roles() -> None:
    assert set(get_args(Rol)) == {r.value for r in RolUsuario}
