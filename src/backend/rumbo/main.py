from fastapi import APIRouter, FastAPI

from rumbo.presentacion.errores import registrar_manejadores

router_base = APIRouter(prefix="/api")


@router_base.get("/salud")
async def salud() -> dict[str, str]:
    return {"estado": "ok"}


def crear_app() -> FastAPI:
    app = FastAPI(title="Rumbo", docs_url="/api/docs", openapi_url="/api/openapi.json")
    registrar_manejadores(app)
    app.include_router(router_base)
    return app


app = crear_app()
