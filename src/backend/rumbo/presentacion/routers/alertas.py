"""Rutas del módulo alertas (CU-14, CU-28, CU-30). Stubs: responden 501 hasta su backend."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from rumbo.datos.modelos import EstadoAlerta, TipoAlerta
from rumbo.presentacion.contrato import TODOS, no_implementado, operacion
from rumbo.presentacion.esquemas.alertas import (
    Alerta,
    AlertaCrear,
    AlertaEditar,
    AlertaPosponer,
    ProgresoDelDia,
)
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(prefix="/alertas", tags=["alertas"])

PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]

# La agenda publica su página inline, con `Alerta` por referencia, como en el contrato.
_AGENDA = operacion(TODOS, "CU-14, CU-30", 422)
_AGENDA["responses"][200] = {
    "description": (
        "Alertas. Por defecto, las propias pendientes hasta hoy; con `proximas=true`, las "
        "pendientes con fecha posterior a hoy (CU-14 A5). Los recontactos de CU-30 son las de "
        "tipo `recontacto`."
    ),
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "properties": {
                    "items": {"type": "array", "items": {"$ref": "#/components/schemas/Alerta"}},
                    "total": {"type": "integer", "description": "Cantidad total de resultados."},
                    "pagina": {"type": "integer", "minimum": 1},
                    "por_pagina": {"type": "integer", "minimum": 1, "maximum": 100},
                },
                "required": ["items", "total", "pagina", "por_pagina"],
            }
        }
    },
}


@router.get(
    "",
    operation_id="listar_alertas",
    summary="Ver la agenda de alertas",
    response_model=None,
    **_AGENDA,
)
async def listar_alertas(
    paginacion: PaginaDep,
    hasta: Annotated[date | None, Query(description="Fin del período.")] = None,
    estado: Annotated[EstadoAlerta | None, Query()] = None,
    tipo: Annotated[TipoAlerta | None, Query()] = None,
    proximas: Annotated[
        bool,
        Query(
            description="Solo las pendientes con fecha posterior a hoy, para adelantar trabajo "
            "(CU-14 A5)."
        ),
    ] = False,
    todas: Annotated[
        bool, Query(description="Las de toda la agencia: solo admin y dueño (CU-14 A1).")
    ] = False,
    propietario_id: Annotated[
        uuid.UUID | None,
        Query(description="Agenda de un responsable: solo admin y dueño (CU-14 A1)."),
    ] = None,
) -> Pagina[Alerta]:
    raise no_implementado()


@router.post(
    "",
    operation_id="crear_recordatorio",
    summary="Crear un recordatorio manual",
    status_code=201,
    **operacion(TODOS, "CU-28", 422),
)
async def crear_recordatorio(datos: AlertaCrear) -> Alerta:
    raise no_implementado()


# Antes que `/{alerta_id}`: si no, "progreso-del-dia" se leería como un id.
@router.get(
    "/progreso-del-dia",
    operation_id="ver_progreso_del_dia",
    summary="Ver el progreso del día de la agenda",
    **operacion(TODOS, "CU-14"),
)
async def ver_progreso_del_dia() -> ProgresoDelDia:
    raise no_implementado()


@router.get(
    "/{alerta_id}",
    operation_id="obtener_alerta",
    summary="Ver una alerta",
    **operacion(TODOS, "CU-14", 404),
)
async def obtener_alerta(alerta_id: uuid.UUID) -> Alerta:
    raise no_implementado()


@router.patch(
    "/{alerta_id}",
    operation_id="editar_recordatorio",
    summary="Editar fecha o descripción de un recordatorio",
    **operacion(TODOS, "CU-28", 403, 404, 409, 422, escritura=True),
)
async def editar_recordatorio(alerta_id: uuid.UUID, cambios: AlertaEditar) -> Alerta:
    raise no_implementado()


@router.post(
    "/{alerta_id}/vista",
    operation_id="marcar_alerta_vista",
    summary="Marcar una alerta como vista",
    **operacion(TODOS, "CU-14", 403, 404, 409, escritura=True),
)
async def marcar_alerta_vista(alerta_id: uuid.UUID) -> Alerta:
    raise no_implementado()


@router.post(
    "/{alerta_id}/resolver",
    operation_id="resolver_alerta",
    summary="Resolver una alerta",
    **operacion(TODOS, "CU-14", 403, 404, 409, escritura=True),
)
async def resolver_alerta(alerta_id: uuid.UUID) -> Alerta:
    raise no_implementado()


@router.post(
    "/{alerta_id}/posponer",
    operation_id="posponer_alerta",
    summary="Posponer una alerta",
    **operacion(TODOS, "CU-14, CU-30", 403, 404, 409, 422, escritura=True),
)
async def posponer_alerta(alerta_id: uuid.UUID, datos: AlertaPosponer) -> Alerta:
    raise no_implementado()
