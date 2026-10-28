from fastapi import APIRouter, FastAPI

from rumbo.core.config import get_settings
from rumbo.core.seguridad import emulador_configurado
from rumbo.presentacion.errores import registrar_manejadores
from rumbo.presentacion.openapi import registrar_openapi
from rumbo.presentacion.routers import (
    alertas,
    clientes,
    configuracion,
    economia,
    hoteles,
    oportunidades,
    seguridad,
    usuarios,
    viajes,
)

router_base = APIRouter(prefix="/api")


@router_base.get("/salud")
async def salud() -> dict[str, str]:
    return {"estado": "ok"}


def crear_app() -> FastAPI:
    config = get_settings()  # falla al arrancar si falta DATABASE_URL
    emulador_configurado(config)  # y si hay Auth Emulator fuera de desarrollo (DEC-0016)
    app = FastAPI(title="Rumbo", docs_url="/api/docs", openapi_url="/api/openapi.json")
    registrar_manejadores(app)
    registrar_openapi(app)
    app.include_router(router_base)
    for router in (
        seguridad.router,
        usuarios.router,
        configuracion.router,
        clientes.router,
        alertas.router,
        oportunidades.router,
        viajes.router,
        economia.router,
        hoteles.router,
    ):
        app.include_router(router, prefix="/api")
    return app


app = crear_app()
