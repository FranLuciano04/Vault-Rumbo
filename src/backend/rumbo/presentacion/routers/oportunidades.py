"""Rutas del módulo oportunidades y cotizaciones (CU-04, CU-05, CU-06). Las que siguen en 501
esperan su ticket de backend."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.datos.modelos import EstadoOportunidad
from rumbo.negocio.servicios import oportunidades
from rumbo.presentacion.contrato import (
    TODOS,
    no_implementado,
    operacion,
    operacion_de_registro,
    respuesta_pagina,
)
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.alertas import Alerta
from rumbo.presentacion.esquemas.oportunidades import (
    Cotizacion,
    CotizacionCrear,
    Insistencia,
    Oportunidad,
    OportunidadCrear,
    OportunidadEditar,
    OportunidadPerder,
)
from rumbo.presentacion.mapeos_alertas import esquema_de_alerta
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(tags=["oportunidades"])

PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]
ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]


class DocumentoPdf(Response):
    media_type = "application/pdf"


_EMBUDO = operacion(TODOS, "CU-05", 422, visibilidad=True)
_EMBUDO["responses"][200] = respuesta_pagina(
    "Oportunidad",
    "Oportunidades (el embudo). Ordenadas por la última modificación; con `mios=true`, solo las "
    "que tengo asignadas.",
)
_VERSIONES = operacion_de_registro(404, 422, casos_de_uso="CU-06", escritura=False)
_VERSIONES["responses"][200] = respuesta_pagina(
    "Cotizacion", "Versiones de la cotización, de la más reciente a la más antigua."
)
_DOCUMENTO = operacion_de_registro(404, casos_de_uso="CU-06", escritura=False)
_DOCUMENTO["responses"][200] = {
    "description": "Documento para enviar al cliente.",
    "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}},
}
_REACTIVAR = operacion_de_registro(403, 404, 409, casos_de_uso="CU-05")
_REACTIVAR["description"] = (
    "Vuelve a «en gestión» y limpia el motivo de pérdida (CU-05 A3).\n\n"
    + _REACTIVAR["description"]
)


@router.get(
    "/oportunidades",
    operation_id="listar_oportunidades",
    summary="Listar oportunidades (embudo)",
    response_model=None,
    **_EMBUDO,
)
async def listar_oportunidades(
    paginacion: PaginaDep,
    actor: ActorDep,
    sesion: SesionDep,
    mios: Annotated[bool, Query(description="Solo las oportunidades que tengo asignadas.")] = False,
    estado: Annotated[EstadoOportunidad | None, Query()] = None,
    cliente_id: Annotated[uuid.UUID | None, Query()] = None,
    responsable_id: Annotated[
        uuid.UUID | None,
        Query(description="Solo las asignadas a ese responsable; si viene `mios`, gana `mios`."),
    ] = None,
) -> Pagina[Oportunidad]:
    items, total = await oportunidades.listar_oportunidades(
        sesion,
        actor,
        estado=estado,
        cliente_id=cliente_id,
        responsable_id=responsable_id,
        mios=mios,
        desplazamiento=paginacion.desplazamiento,
        limite=paginacion.por_pagina,
    )
    return Pagina(
        items=[Oportunidad.model_validate(o) for o in items],
        total=total,
        pagina=paginacion.pagina,
        por_pagina=paginacion.por_pagina,
    )


@router.post(
    "/oportunidades",
    operation_id="registrar_consulta",
    summary="Registrar una consulta",
    status_code=201,
    **operacion(TODOS, "CU-04, CU-30", 422),
)
async def registrar_consulta(
    datos: OportunidadCrear, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    oportunidad = await oportunidades.registrar_consulta(sesion, actor, datos.model_dump())
    return Oportunidad.model_validate(oportunidad)


@router.get(
    "/oportunidades/{oportunidad_id}",
    operation_id="obtener_oportunidad",
    summary="Ver una oportunidad",
    **operacion_de_registro(404, casos_de_uso="CU-05", escritura=False),
)
async def obtener_oportunidad(
    oportunidad_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    return Oportunidad.model_validate(
        await oportunidades.obtener_oportunidad(sesion, actor, oportunidad_id)
    )


@router.patch(
    "/oportunidades/{oportunidad_id}",
    operation_id="editar_oportunidad",
    summary="Editar una oportunidad o sus notas de seguimiento",
    **operacion_de_registro(403, 404, 422, casos_de_uso="CU-05"),
)
async def editar_oportunidad(
    oportunidad_id: uuid.UUID, cambios: OportunidadEditar, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    oportunidad = await oportunidades.editar_oportunidad(
        sesion, actor, oportunidad_id, cambios.model_dump(exclude_unset=True)
    )
    return Oportunidad.model_validate(oportunidad)


@router.post(
    "/oportunidades/{oportunidad_id}/en-gestion",
    operation_id="tomar_oportunidad",
    summary="Pasar la oportunidad a en gestión",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-05"),
)
async def tomar_oportunidad(
    oportunidad_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    return Oportunidad.model_validate(
        await oportunidades.pasar_a_en_gestion(sesion, actor, oportunidad_id)
    )


@router.post(
    "/oportunidades/{oportunidad_id}/insistencias",
    operation_id="agendar_insistencia",
    summary="Agendar una insistencia",
    status_code=201,
    **operacion_de_registro(403, 404, 422, casos_de_uso="CU-05"),
)
async def agendar_insistencia(
    oportunidad_id: uuid.UUID, datos: Insistencia, actor: ActorDep, sesion: SesionDep
) -> Alerta:
    return esquema_de_alerta(
        *await oportunidades.agendar_insistencia(
            sesion, actor, oportunidad_id, datos.fecha, datos.descripcion
        )
    )


@router.post(
    "/oportunidades/{oportunidad_id}/perder",
    operation_id="perder_oportunidad",
    summary="Cerrar la oportunidad como perdida",
    **operacion_de_registro(403, 404, 409, 422, casos_de_uso="CU-05"),
)
async def perder_oportunidad(
    oportunidad_id: uuid.UUID, datos: OportunidadPerder, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    oportunidad = await oportunidades.perder_oportunidad(
        sesion, actor, oportunidad_id, datos.motivo_perdida, datos.motivo_perdida_detalle
    )
    return Oportunidad.model_validate(oportunidad)


@router.post(
    "/oportunidades/{oportunidad_id}/reactivar",
    operation_id="reactivar_oportunidad",
    summary="Reactivar una oportunidad perdida",
    **_REACTIVAR,
)
async def reactivar_oportunidad(
    oportunidad_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    return Oportunidad.model_validate(
        await oportunidades.reactivar_oportunidad(sesion, actor, oportunidad_id)
    )


@router.post(
    "/oportunidades/{oportunidad_id}/ganar",
    operation_id="ganar_oportunidad_sin_cotizacion",
    summary="Cerrar como ganada sin cotización formal (venta directa)",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-05"),
)
async def ganar_oportunidad_sin_cotizacion(
    oportunidad_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Oportunidad:
    return Oportunidad.model_validate(
        await oportunidades.ganar_oportunidad(sesion, actor, oportunidad_id)
    )


@router.get(
    "/oportunidades/{oportunidad_id}/cotizaciones",
    operation_id="listar_cotizaciones",
    summary="Listar las cotizaciones (versiones) de una oportunidad",
    response_model=None,
    **_VERSIONES,
)
async def listar_cotizaciones(
    oportunidad_id: uuid.UUID, paginacion: PaginaDep, actor: ActorDep, sesion: SesionDep
) -> Pagina[Cotizacion]:
    items, total = await oportunidades.listar_cotizaciones(
        sesion,
        actor,
        oportunidad_id,
        desplazamiento=paginacion.desplazamiento,
        limite=paginacion.por_pagina,
    )
    return Pagina(
        items=[Cotizacion.model_validate(c) for c in items],
        total=total,
        pagina=paginacion.pagina,
        por_pagina=paginacion.por_pagina,
    )


@router.post(
    "/oportunidades/{oportunidad_id}/cotizaciones",
    operation_id="emitir_cotizacion",
    summary="Emitir una cotización o una nueva versión",
    status_code=201,
    **operacion_de_registro(403, 404, 409, 422, casos_de_uso="CU-06"),
)
async def emitir_cotizacion(
    oportunidad_id: uuid.UUID, datos: CotizacionCrear, actor: ActorDep, sesion: SesionDep
) -> Cotizacion:
    cotizacion = await oportunidades.emitir_cotizacion(
        sesion, actor, oportunidad_id, datos.moneda, [i.model_dump() for i in datos.items]
    )
    return Cotizacion.model_validate(cotizacion)


@router.get(
    "/cotizaciones/{cotizacion_id}",
    operation_id="obtener_cotizacion",
    summary="Ver una cotización",
    **operacion_de_registro(404, casos_de_uso="CU-06", escritura=False),
)
async def obtener_cotizacion(cotizacion_id: uuid.UUID) -> Cotizacion:
    raise no_implementado()


@router.get(
    "/cotizaciones/{cotizacion_id}/documento",
    operation_id="descargar_cotizacion",
    summary="Descargar el documento de la cotización",
    response_class=DocumentoPdf,
    response_model=None,
    **_DOCUMENTO,
)
async def descargar_cotizacion(cotizacion_id: uuid.UUID) -> Response:
    raise no_implementado()


@router.post(
    "/cotizaciones/{cotizacion_id}/enviar",
    operation_id="marcar_cotizacion_enviada",
    summary="Marcar la cotización como enviada",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-06"),
)
async def marcar_cotizacion_enviada(
    cotizacion_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Cotizacion:
    return Cotizacion.model_validate(
        await oportunidades.marcar_cotizacion_enviada(sesion, actor, cotizacion_id)
    )


@router.post(
    "/cotizaciones/{cotizacion_id}/aceptar",
    operation_id="aceptar_cotizacion",
    summary="Registrar que el cliente aceptó la cotización",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-06"),
)
async def aceptar_cotizacion(
    cotizacion_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Cotizacion:
    return Cotizacion.model_validate(
        await oportunidades.aceptar_cotizacion(sesion, actor, cotizacion_id)
    )


@router.post(
    "/cotizaciones/{cotizacion_id}/rechazar",
    operation_id="rechazar_cotizacion",
    summary="Registrar que el cliente rechazó la cotización",
    **operacion_de_registro(403, 404, 409, casos_de_uso="CU-06"),
)
async def rechazar_cotizacion(
    cotizacion_id: uuid.UUID, actor: ActorDep, sesion: SesionDep
) -> Cotizacion:
    return Cotizacion.model_validate(
        await oportunidades.rechazar_cotizacion(sesion, actor, cotizacion_id)
    )
