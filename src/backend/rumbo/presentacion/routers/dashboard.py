"""Rutas del dashboard y los reportes (CU-21, CU-22). Todas son stubs que responden 501."""

import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Path, Query

from rumbo.core.db import SesionDep
from rumbo.core.fechas import hoy, sumar_meses
from rumbo.datos import modelos
from rumbo.datos.modelos import Moneda
from rumbo.negocio.servicios import dashboard
from rumbo.presentacion.contrato import GESTION, TODOS, no_implementado, operacion
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.dashboard import (
    Dashboard,
    Embudo,
    EtapaEmbudo,
    MontoPorMoneda,
    Reporte,
    ReporteCatalogo,
)

router = APIRouter(tags=["dashboard"])

ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_ARCHIVO = {"schema": {"type": "string", "format": "binary"}}

_DASHBOARD = operacion(TODOS, "CU-21", 422, visibilidad=True)
_DASHBOARD["description"] += (
    "\n\nAdmin y dueño ven toda la agencia; empleado y freelance, solo lo suyo (CU-21 A1)."
)
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
    **_DASHBOARD,
)
async def ver_dashboard(
    actor: ActorDep,
    sesion: SesionDep,
    desde: Annotated[
        date | None, Query(description="Inicio del período. Sin él, el mes en curso.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fin del período. Sin él, el mes en curso.")
    ] = None,
    responsable_id: Annotated[
        uuid.UUID | None,
        Query(
            description="Indicadores de un responsable: solo admin y dueño (CU-21 A1); para "
            "empleado y freelance se ignora y se usa el propio."
        ),
    ] = None,
) -> Dashboard:
    primero_del_mes = hoy().replace(day=1)
    desde = desde or primero_del_mes
    hasta = hasta or sumar_meses(primero_del_mes, 1) - timedelta(days=1)
    indicadores = await dashboard.calcular_indicadores(
        sesion, actor, desde=desde, hasta=hasta, responsable_id=responsable_id
    )
    return Dashboard(
        desde=desde,
        hasta=hasta,
        embudo=Embudo(
            etapas=[EtapaEmbudo(estado=e, cantidad=n) for e, n in indicadores.etapas.items()],
            tasa_conversion=indicadores.tasa_conversion,
        ),
        ventas=_montos(indicadores.ventas),
        ganancia_estimada=_montos(indicadores.ganancia_estimada),
        margen=_montos(indicadores.margen),
        comisiones=_montos(indicadores.comisiones),
        cobrado=_montos(indicadores.cobrado),
        pendiente_de_cobrar=_montos(indicadores.pendiente_de_cobrar),
        # Indicadores operativos: ticket propio (T-122); hasta entonces, vacíos o en cero.
        ventas_mensuales=[],
        ticket_promedio=[],
        pendiente_de_pagar=[],
        proximos_vencimientos=[],
        viajes_proximos=[],
        consultas_pendientes=0,
        presupuestos_abiertos=0,
        reservas_confirmadas=0,
        alertas_pendientes=0,
        destinos_mas_vendidos=[],
        ventas_por_vendedor=[],
    )


def _montos(totales: dict[Moneda, Decimal]) -> list[MontoPorMoneda]:
    return [
        MontoPorMoneda(moneda=m, monto=totales[m]) for m in sorted(totales, key=lambda m: m.value)
    ]


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
