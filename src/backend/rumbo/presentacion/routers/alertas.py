"""Rutas del módulo alertas (CU-14, CU-28, CU-30)."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import inspect

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.datos.modelos import EstadoAlerta, TipoAlerta
from rumbo.negocio.servicios import alertas
from rumbo.negocio.servicios.alertas import ContextoDeAlerta
from rumbo.presentacion.contrato import TODOS, operacion
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.alertas import (
    Alerta,
    AlertaCrear,
    AlertaEditar,
    AlertaPosponer,
    ClienteDeAlerta,
    ContextoAlerta,
    OportunidadDeAlerta,
    PagoDeAlerta,
    ProgresoDelDia,
    ResponsableAlerta,
    ViajeDeAlerta,
)
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(prefix="/alertas", tags=["alertas"])

PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]
ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]


# La agenda publica su página inline, con `Alerta` por referencia, como en el contrato.
_AGENDA = operacion(TODOS, "CU-14, CU-30", 422)
_AGENDA["responses"][200] = {
    "description": (
        "Alertas. Por defecto, las propias pendientes hasta hoy (admin y dueño, las de toda la "
        "agencia); con `proximas=true`, las pendientes con fecha posterior a hoy (CU-14 A5). "
        "Los recontactos de CU-30 son las de tipo `recontacto`."
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


def _contexto(contexto: ContextoDeAlerta) -> ContextoAlerta:
    def de[E: BaseModel](esquema: type[E], origen: object | None) -> E | None:
        return None if origen is None else esquema.model_validate(origen, from_attributes=True)

    viaje, pago = contexto.viaje, contexto.pago
    return ContextoAlerta(
        cliente=de(ClienteDeAlerta, contexto.cliente),
        oportunidad=de(OportunidadDeAlerta, contexto.oportunidad),
        viaje=None
        if viaje is None
        else ViajeDeAlerta(
            id=viaje.viaje.id,
            destino_id=viaje.viaje.destino_id,
            destino=viaje.destino,
            estado=viaje.viaje.estado,
            fecha_salida=viaje.viaje.fecha_salida,
            fecha_regreso=viaje.viaje.fecha_regreso,
        ),
        pago=None
        if pago is None
        else PagoDeAlerta(
            id=pago.pago.id,
            tipo=pago.pago.tipo,
            monto=pago.pago.monto,
            moneda=pago.moneda,
            vencimiento=pago.pago.vencimiento,
            estado=pago.pago.estado,
        ),
    )


def _alerta(alerta: modelos.Alerta, contexto: ContextoDeAlerta) -> Alerta:
    """La `Alerta` del ORM con su responsable y su contexto, validada contra el contrato."""
    columnas = {c.key: getattr(alerta, c.key) for c in inspect(modelos.Alerta).column_attrs}
    return Alerta.model_validate(
        {
            **columnas,
            "responsable": ResponsableAlerta.model_validate(
                contexto.responsable, from_attributes=True
            ),
            "contexto": _contexto(contexto),
        }
    )


@router.get(
    "",
    operation_id="listar_alertas",
    summary="Ver la agenda de alertas",
    response_model=None,
    **_AGENDA,
)
async def listar_alertas(
    paginacion: PaginaDep,
    actor: ActorDep,
    sesion: SesionDep,
    desde: Annotated[
        date | None,
        Query(
            description="Piso de fecha inclusive (`fecha >= desde`), combinable con `hasta` y "
            "`proximas`. Con `desde` y `hasta` iguales se lista un solo día."
        ),
    ] = None,
    hasta: Annotated[
        date | None,
        Query(
            description="Tope de fecha dentro de la ventana: sin `proximas`, las de fecha "
            "hasta el menor entre hoy y `hasta`; con `proximas`, las posteriores a hoy hasta "
            "`hasta` inclusive."
        ),
    ] = None,
    estado: Annotated[EstadoAlerta | None, Query()] = None,
    tipo: Annotated[TipoAlerta | None, Query()] = None,
    proximas: Annotated[
        bool,
        Query(
            description="Solo las pendientes con fecha posterior a hoy, para adelantar trabajo "
            "(CU-14 A5)."
        ),
    ] = False,
    propietario_id: Annotated[
        uuid.UUID | None,
        Query(
            description="Agenda de un responsable: solo admin y dueño (CU-14 A1); para el "
            "resto se ignora."
        ),
    ] = None,
    oportunidad_id: Annotated[
        uuid.UUID | None,
        Query(
            description="Solo las alertas cuyo origen es esta `Oportunidad` (RF-015), de "
            "cualquier fecha: ignora la ventana de hoy y `proximas`; respeta `estado`, `tipo` y "
            "la visibilidad del rol."
        ),
    ] = None,
) -> Pagina[Alerta]:
    items, total = await alertas.listar_agenda(
        sesion,
        actor,
        proximas=proximas,
        estado=estado,
        tipo=tipo,
        desde=desde,
        hasta=hasta,
        propietario_id=propietario_id,
        oportunidad_id=oportunidad_id,
        desplazamiento=paginacion.desplazamiento,
        limite=paginacion.por_pagina,
    )
    return Pagina(
        items=[_alerta(a, contexto) for a, contexto in items],
        total=total,
        pagina=paginacion.pagina,
        por_pagina=paginacion.por_pagina,
    )


@router.post(
    "",
    operation_id="crear_recordatorio",
    summary="Crear un recordatorio manual",
    status_code=201,
    **operacion(TODOS, "CU-28", 404, 422),
)
async def crear_recordatorio(datos: AlertaCrear, actor: ActorDep, sesion: SesionDep) -> Alerta:
    return _alerta(
        *await alertas.crear_recordatorio(
            sesion,
            actor,
            datos.fecha,
            datos.descripcion,
            cliente_id=datos.cliente_id,
            oportunidad_id=datos.oportunidad_id,
            viaje_id=datos.viaje_id,
        )
    )


# Antes que `/{alerta_id}`: si no, "progreso-del-dia" se leería como un id.
@router.get(
    "/progreso-del-dia",
    operation_id="ver_progreso_del_dia",
    summary="Ver el progreso del día de la agenda",
    **operacion(TODOS, "CU-14"),
)
async def ver_progreso_del_dia(actor: ActorDep, sesion: SesionDep) -> ProgresoDelDia:
    resueltas_hoy, total_del_dia = await alertas.progreso_del_dia(sesion, actor)
    return ProgresoDelDia(resueltas_hoy=resueltas_hoy, total_del_dia=total_del_dia)


@router.get(
    "/{alerta_id}",
    operation_id="obtener_alerta",
    summary="Ver una alerta",
    **operacion(TODOS, "CU-14", 404),
)
async def obtener_alerta(alerta_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Alerta:
    return _alerta(*await alertas.obtener_alerta(sesion, actor, alerta_id))


@router.patch(
    "/{alerta_id}",
    operation_id="editar_recordatorio",
    summary="Editar fecha o descripción de un recordatorio",
    **operacion(
        TODOS,
        "CU-28",
        403,
        404,
        409,
        422,
        escritura=(
            "solo el responsable del recordatorio lo edita (DEC-0005); admin y dueño atienden "
            "las alertas ajenas pero no cambian su texto ni su fecha."
        ),
    ),
)
async def editar_recordatorio(
    alerta_id: uuid.UUID, cambios: AlertaEditar, actor: ActorDep, sesion: SesionDep
) -> Alerta:
    return _alerta(
        *await alertas.editar_recordatorio(
            sesion, actor, alerta_id, cambios.model_dump(exclude_unset=True)
        )
    )


@router.post(
    "/{alerta_id}/vista",
    operation_id="marcar_alerta_vista",
    summary="Marcar una alerta como vista",
    **operacion(TODOS, "CU-14", 403, 404, 409, escritura=True),
)
async def marcar_alerta_vista(alerta_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Alerta:
    return _alerta(*await alertas.marcar_vista(sesion, actor, alerta_id))


@router.post(
    "/{alerta_id}/resolver",
    operation_id="resolver_alerta",
    summary="Resolver una alerta",
    **operacion(TODOS, "CU-14", 403, 404, 409, escritura=True),
)
async def resolver_alerta(alerta_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Alerta:
    return _alerta(*await alertas.resolver(sesion, actor, alerta_id))


@router.post(
    "/{alerta_id}/posponer",
    operation_id="posponer_alerta",
    summary="Posponer una alerta",
    **operacion(TODOS, "CU-14, CU-30", 403, 404, 409, 422, escritura=True),
)
async def posponer_alerta(
    alerta_id: uuid.UUID, datos: AlertaPosponer, actor: ActorDep, sesion: SesionDep
) -> Alerta:
    return _alerta(*await alertas.posponer(sesion, actor, alerta_id, datos.fecha))
