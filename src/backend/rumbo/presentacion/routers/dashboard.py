"""Rutas del dashboard y los reportes (CU-21, CU-22). Todas son stubs que responden 501."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query

from rumbo.presentacion.contrato import GESTION, TODOS, no_implementado, operacion
from rumbo.presentacion.esquemas.dashboard import Dashboard, Reporte, ReporteCatalogo

router = APIRouter(tags=["dashboard"])

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_ARCHIVO = {"schema": {"type": "string", "format": "binary"}}

_REPORTE = operacion(GESTION, "CU-22", 404, 422)
_REPORTE["responses"][200] = {
    "description": (
        "El reporte del período: JSON por defecto, o Excel (`xlsx`) o PDF resumido (`pdf`) "
        "con el mismo contenido, según `formato`."
    ),
    "content": {XLSX: _ARCHIVO, "application/pdf": _ARCHIVO},
}


@router.get(
    "/dashboard",
    operation_id="ver_dashboard",
    summary="Ver indicadores y embudo de ventas",
    **operacion(TODOS, "CU-21", 422, visibilidad=True),
)
async def ver_dashboard(
    desde: Annotated[
        date | None, Query(description="Inicio del período. Sin él, el mes en curso.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fin del período. Sin él, el mes en curso.")
    ] = None,
) -> Dashboard:
    raise no_implementado()


@router.get(
    "/reportes",
    operation_id="listar_reportes",
    summary="Ver el catálogo de reportes",
    **operacion(GESTION, "CU-22"),
)
async def listar_reportes() -> list[ReporteCatalogo]:
    raise no_implementado()


@router.get(
    "/reportes/{reporte_id}",
    operation_id="generar_reporte",
    summary="Generar un reporte del período",
    **_REPORTE,
)
async def generar_reporte(
    reporte_id: Annotated[str, Path(description="Identificador del catálogo (`/reportes`).")],
    desde: Annotated[
        date | None, Query(description="Inicio del período. Sin él, el mes en curso.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fin del período. Sin él, el mes en curso.")
    ] = None,
    comparar_desde: Annotated[
        date | None, Query(description="Inicio del período contra el que comparar (CU-22 A2).")
    ] = None,
    comparar_hasta: Annotated[
        date | None, Query(description="Fin del período contra el que comparar (CU-22 A2).")
    ] = None,
    formato: Annotated[
        Literal["json", "xlsx", "pdf"], Query(description="Formato de salida.")
    ] = "json",
) -> Reporte:
    raise no_implementado()
