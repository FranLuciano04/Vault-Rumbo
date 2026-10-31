"""Rutas del calendario (CU-23): viajes, vencimientos de pagos y alertas en un rango."""

import uuid
from dataclasses import asdict
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.negocio.servicios import calendario
from rumbo.presentacion.contrato import TODOS, operacion
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.calendario import EventoCalendario, TipoEvento

router = APIRouter(tags=["calendario"])

ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]

_CALENDARIO = operacion(TODOS, "CU-23", 422, visibilidad=True)
_CALENDARIO["description"] += (
    "\n\nIncluye los vencimientos de pagos no anulados y las alertas programadas, de "
    "cualquier estado (el cliente filtra por estado; DEC-0024). Con un solo extremo del rango, "
    "el otro es el del mes de ese extremo; el rango admite hasta 62 días. "
    "Admin, dueño y empleado ven toda la agencia, salvo las alertas ajenas, que solo "
    "ven admin y dueño; el freelance ve lo suyo e ignora `responsable_id`."
)


@router.get(
    "/calendario",
    operation_id="ver_calendario",
    summary="Ver viajes, vencimientos y alertas en el calendario",
    **_CALENDARIO,
)
async def ver_calendario(
    actor: ActorDep,
    sesion: SesionDep,
    desde: Annotated[
        date | None, Query(description="Inicio del rango visible. Sin él, el mes en curso.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fin del rango visible. Sin él, el mes en curso.")
    ] = None,
    mios: Annotated[bool, Query(description="Solo los eventos que tengo asignados.")] = False,
    tipo: Annotated[
        TipoEvento | None, Query(description="Solo viajes, vencimientos o alertas.")
    ] = None,
    responsable_id: Annotated[
        uuid.UUID | None, Query(description="Solo los eventos de un responsable.")
    ] = None,
) -> list[EventoCalendario]:
    eventos = await calendario.consultar_calendario(
        sesion,
        actor,
        desde=desde,
        hasta=hasta,
        mios=mios,
        tipo=tipo,
        responsable_id=responsable_id,
    )
    return [EventoCalendario(**asdict(e)) for e in eventos]
