from fastapi import APIRouter, FastAPI

from rumbo.core.config import get_settings
from rumbo.presentacion.errores import registrar_manejadores

router_base = APIRouter(prefix="/api")


@router_base.get("/salud")
async def salud() -> dict[str, str]:
    return {"estado": "ok"}


def crear_app() -> FastAPI:
    get_settings()  # falla al arrancar si falta DATABASE_URL
    app = FastAPI(title="Rumbo", docs_url="/api/docs", openapi_url="/api/openapi.json")
    registrar_manejadores(app)
    app.include_router(router_base)
    return app


app = crear_app()
