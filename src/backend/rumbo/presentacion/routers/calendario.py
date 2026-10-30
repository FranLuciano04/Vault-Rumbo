"""Rutas del calendario (CU-23). Son stubs que responden 501."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from rumbo.presentacion.contrato import TODOS, no_implementado, operacion
from rumbo.presentacion.esquemas.calendario import EventoCalendario, TipoEvento

router = APIRouter(tags=["calendario"])


@router.get(
    "/calendario",
    operation_id="ver_calendario",
    summary="Ver viajes y vencimientos en el calendario",
    **operacion(TODOS, "CU-23", 422),
)
async def ver_calendario(
    desde: Annotated[
        date | None, Query(description="Inicio del rango visible. Sin él, el mes en curso.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fin del rango visible. Sin él, el mes en curso.")
    ] = None,
    mios: Annotated[
        bool, Query(description="Solo los viajes y vencimientos que tengo asignados.")
    ] = False,
    tipo: Annotated[
        TipoEvento | None, Query(description="Solo viajes o solo vencimientos.")
    ] = None,
    responsable_id: Annotated[
        uuid.UUID | None, Query(description="Solo los eventos de un responsable.")
    ] = None,
) -> list[EventoCalendario]:
    raise no_implementado()
