"""Rutas del módulo economía (CU-10, CU-11, CU-12). Las que todavía son stubs responden 501."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import Field

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.negocio.servicios import economia
from rumbo.presentacion.contrato import no_implementado, operacion_de_registro
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.economia import (
    CobroRegistrar,
    EconomiaViaje,
    Pago,
    PagoDividir,
    PagoReprogramar,
    PlanDePagos,
)
from rumbo.presentacion.esquemas.viajes import EconomiaRegistrada

router = APIRouter(tags=["economia"])

ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]


@router.put(
    "/viajes/{viaje_id}/economia",
    operation_id="registrar_economia",
    summary="Registrar la economía del viaje",
    **operacion_de_registro(403, 404, 409, 422, casos_de_uso="CU-10"),
)
async def registrar_economia(
    viaje_id: uuid.UUID, datos: EconomiaViaje, actor: ActorDep, sesion: SesionDep
) -> EconomiaRegistrada:
    resultado = await economia.registrar_economia(sesion, actor, viaje_id, datos.model_dump())
    return EconomiaRegistrada.desde_modelo(
        resultado.viaje,
        resultado.saldo_pendiente,
        resultado.porcentaje_pagado,
        resultado.advertencias,
    )


@router.get(
    "/viajes/{viaje_id}/pagos",
    operation_id="listar_pagos",
    summary="Ver el plan de pagos y su checklist",
    **operacion_de_registro(404, casos_de_uso="CU-11, CU-12", escritura=False),
)
async def listar_pagos(viaje_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> list[Pago]:
    pagos = await economia.listar_pagos(sesion, actor, viaje_id)
    return [Pago.model_validate(p) for p in pagos]


@router.put(
    "/viajes/{viaje_id}/pagos",
    operation_id="definir_plan_de_pagos",
    summary="Definir o rebalancear el plan de pagos",
    **operacion_de_registro(403, 404, 422, casos_de_uso="CU-11"),
)
async def definir_plan_de_pagos(
    viaje_id: uuid.UUID, datos: PlanDePagos, actor: ActorDep, sesion: SesionDep
) -> list[Pago]:
    items = [item.model_dump() for item in datos.pagos]
    pagos = await economia.definir_plan_de_pagos(sesion, actor, viaje_id, items)
    return [Pago.model_validate(p) for p in pagos]


@router.patch(
    "/pagos/{pago_id}",
    operation_id="reprogramar_pago",
    summary="Reprogramar el vencimiento de un pago",
    **operacion_de_registro(403, 404, 409, 422, casos_de_uso="CU-11"),
)
async def reprogramar_pago(pago_id: uuid.UUID, cambios: PagoReprogramar) -> Pago:
    raise no_implementado()


@router.post(
    "/pagos/{pago_id}/anular",
    operation_id="anular_pago",
    summary="Anular un pago (baja lógica)",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-11"),
)
async def anular_pago(pago_id: uuid.UUID) -> Pago:
    raise no_implementado()


@router.post(
    "/pagos/{pago_id}/dividir",
    operation_id="dividir_pago",
    summary="Dividir un pago para cobrar una parte",
    status_code=201,
    **operacion_de_registro(403, 404, 409, 422, casos_de_uso="CU-11"),
)
async def dividir_pago(
    pago_id: uuid.UUID, datos: PagoDividir
) -> Annotated[list[Pago], Field(min_length=2, max_length=2)]:
    """Devuelve el pago original, con el monto de ahora, y el nuevo con el resto."""
    raise no_implementado()


@router.post(
    "/pagos/{pago_id}/cobrar",
    operation_id="registrar_cobro",
    summary="Registrar el cobro de un pago",
    **operacion_de_registro(403, 404, 409, 422, casos_de_uso="CU-12"),
)
async def registrar_cobro(
    pago_id: uuid.UUID, datos: CobroRegistrar, actor: ActorDep, sesion: SesionDep
) -> Pago:
    pago = await economia.registrar_cobro(sesion, actor, pago_id, datos.model_dump())
    return Pago.model_validate(pago)


@router.post(
    "/pagos/{pago_id}/revertir-cobro",
    operation_id="revertir_cobro",
    summary="Revertir un cobro cargado por error",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-12"),
)
async def revertir_cobro(pago_id: uuid.UUID) -> Pago:
    raise no_implementado()
