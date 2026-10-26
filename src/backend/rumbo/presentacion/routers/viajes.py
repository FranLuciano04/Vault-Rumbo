"""Rutas del módulo viajes (CU-07 a CU-10, CU-27). Stubs: responden 501 hasta su backend."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from rumbo.datos.modelos import EstadoViaje
from rumbo.presentacion.contrato import (
    TODOS,
    no_implementado,
    operacion,
    operacion_de_viaje,
    respuesta_pagina,
)
from rumbo.presentacion.esquemas.viajes import Cancelacion, ConfirmarReserva, Tramo, Viaje
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(tags=["viajes"])

PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]

_LISTADO = operacion(TODOS, "CU-08", 422, visibilidad=True)
_LISTADO["responses"][200] = respuesta_pagina(
    "Viaje",
    "Viajes. Ordenados por fecha de salida; con `mios=true`, solo los que tengo asignados.",
)


@router.post(
    "/oportunidades/{oportunidad_id}/confirmar-reserva",
    operation_id="confirmar_reserva",
    summary="Confirmar la reserva y crear el viaje",
    status_code=201,
    **operacion_de_viaje(403, 404, 409, 422, casos_de_uso="CU-07, CU-10, CU-11"),
)
async def confirmar_reserva(oportunidad_id: uuid.UUID, datos: ConfirmarReserva) -> Viaje:
    raise no_implementado()


@router.get(
    "/viajes",
    operation_id="listar_viajes",
    summary="Listar viajes",
    response_model=None,
    **_LISTADO,
)
async def listar_viajes(
    paginacion: PaginaDep,
    mios: Annotated[bool, Query(description="Solo los viajes que tengo asignados.")] = False,
    desde: Annotated[
        date | None, Query(description="Fecha de salida desde esta fecha, inclusive.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fecha de salida hasta esta fecha, inclusive.")
    ] = None,
    estado: Annotated[EstadoViaje | None, Query()] = None,
    cliente_id: Annotated[uuid.UUID | None, Query()] = None,
) -> Pagina[Viaje]:
    raise no_implementado()


@router.get(
    "/viajes/{viaje_id}",
    operation_id="obtener_viaje",
    summary="Ver la ficha del viaje, con economía y saldo",
    **operacion_de_viaje(404, casos_de_uso="CU-08, CU-10, CU-12", escritura=False),
)
async def obtener_viaje(viaje_id: uuid.UUID) -> Viaje:
    raise no_implementado()


@router.post(
    "/viajes/{viaje_id}/iniciar",
    operation_id="iniciar_viaje",
    summary="Pasar el viaje a en curso",
    **operacion_de_viaje(403, 404, 409, casos_de_uso="CU-08"),
)
async def iniciar_viaje(viaje_id: uuid.UUID) -> Viaje:
    raise no_implementado()


@router.post(
    "/viajes/{viaje_id}/finalizar",
    operation_id="finalizar_viaje",
    summary="Pasar el viaje a finalizado",
    **operacion_de_viaje(403, 404, 409, casos_de_uso="CU-08"),
)
async def finalizar_viaje(viaje_id: uuid.UUID) -> Viaje:
    raise no_implementado()


@router.post(
    "/viajes/{viaje_id}/corregir-estado",
    operation_id="corregir_estado_viaje",
    summary="Volver al estado anterior por un error de carga",
    **operacion_de_viaje(403, 404, 409, casos_de_uso="CU-08"),
)
async def corregir_estado_viaje(viaje_id: uuid.UUID) -> Viaje:
    raise no_implementado()


@router.post(
    "/viajes/{viaje_id}/cancelar",
    operation_id="cancelar_viaje",
    summary="Cancelar el viaje",
    **operacion_de_viaje(403, 404, 409, 422, casos_de_uso="CU-27"),
)
async def cancelar_viaje(viaje_id: uuid.UUID, datos: Cancelacion) -> Viaje:
    raise no_implementado()


@router.post(
    "/viajes/{viaje_id}/revertir-cancelacion",
    operation_id="revertir_cancelacion",
    summary="Revertir la cancelación",
    **operacion_de_viaje(403, 404, 409, casos_de_uso="CU-27"),
)
async def revertir_cancelacion(viaje_id: uuid.UUID) -> Viaje:
    raise no_implementado()


@router.get(
    "/viajes/{viaje_id}/itinerario",
    operation_id="obtener_itinerario",
    summary="Ver el itinerario de hoteles",
    **operacion_de_viaje(404, casos_de_uso="CU-09", escritura=False),
)
async def obtener_itinerario(viaje_id: uuid.UUID) -> list[Tramo]:
    raise no_implementado()


@router.post(
    "/viajes/{viaje_id}/itinerario",
    operation_id="agregar_tramo",
    summary="Agregar un hotel al itinerario",
    status_code=201,
    **operacion_de_viaje(403, 404, 409, 422, casos_de_uso="CU-09"),
)
async def agregar_tramo(viaje_id: uuid.UUID, datos: Tramo) -> Tramo:
    raise no_implementado()


@router.patch(
    "/tramos/{tramo_id}",
    operation_id="editar_tramo",
    summary="Editar un tramo o marcar pagado al proveedor",
    **operacion_de_viaje(403, 404, 409, 422, casos_de_uso="CU-09"),
)
async def editar_tramo(tramo_id: uuid.UUID, cambios: Tramo) -> Tramo:
    raise no_implementado()


@router.delete(
    "/tramos/{tramo_id}",
    operation_id="quitar_tramo",
    summary="Quitar un hotel del itinerario",
    status_code=204,
    **operacion_de_viaje(403, 404, casos_de_uso="CU-09"),
)
async def quitar_tramo(tramo_id: uuid.UUID) -> None:
    """Quita el tramo; su alerta se cierra."""
    raise no_implementado()
