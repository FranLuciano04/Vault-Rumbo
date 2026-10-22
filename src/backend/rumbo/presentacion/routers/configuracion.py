"""Rutas de parámetros del negocio, comisión por defecto, destinos, requisitos y operadores."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.negocio.servicios import configuracion, parametros
from rumbo.presentacion.contrato import GESTION, TODOS, no_implementado, operacion
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.configuracion import (
    ComisionPorDefecto,
    Configuracion,
    ConfiguracionEditar,
    Destino,
    DestinoCrear,
    DestinoEditar,
    Operador,
    OperadorCrear,
    OperadorEditar,
    RequisitoDestino,
    RequisitoDestinoCrear,
    RequisitoDestinoEditar,
)
from rumbo.presentacion.esquemas.usuarios import Usuario
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(tags=["configuracion"])

ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]
PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]


@router.get(
    "/configuracion",
    operation_id="obtener_configuracion",
    summary="Ver los parámetros del negocio",
    **operacion(GESTION, "CU-06, CU-07, CU-30"),
)
async def obtener_configuracion(actor: ActorDep, sesion: SesionDep) -> Configuracion:
    return Configuracion.model_validate(await parametros.ver(sesion, actor))


@router.put(
    "/configuracion",
    operation_id="editar_configuracion",
    summary="Editar los parámetros del negocio",
    **operacion(GESTION, "CU-06, CU-07, CU-30", 422),
)
async def editar_configuracion(
    datos: ConfiguracionEditar,
    actor: ActorDep,
    sesion: SesionDep,
) -> Configuracion:
    parametros_editados = await parametros.editar(sesion, actor, **datos.model_dump())
    return Configuracion.model_validate(parametros_editados)


@router.put(
    "/usuarios/{usuario_id}/comision-por-defecto",
    operation_id="configurar_comision_por_defecto",
    summary="Configurar la comisión por defecto de un vendedor",
    **operacion(GESTION, "CU-13", 404, 422),
)
async def configurar_comision_por_defecto(
    usuario_id: uuid.UUID,
    datos: ComisionPorDefecto,
    actor: ActorDep,
    sesion: SesionDep,
) -> Usuario:
    """CU-13 (RF-083): no recalcula los viajes ya registrados (DEC-0013)."""
    tipo = datos.comision_default_tipo
    usuario = await configuracion.configurar_comision_por_defecto(
        sesion,
        actor,
        usuario_id,
        tipo=None if tipo is None else modelos.TipoComision(tipo),
        valor=datos.comision_default_valor,
    )
    return Usuario.model_validate(usuario)


@router.get(
    "/destinos",
    operation_id="listar_destinos",
    summary="Listar destinos",
    **operacion(TODOS, "CU-26", 422),
)
async def listar_destinos(
    pagina: PaginaDep,
    actor: ActorDep,
    sesion: SesionDep,
    activo: bool | None = True,
    buscar: str | None = None,
) -> Pagina[Destino]:
    """Por defecto solo los activos; `activo=false` trae los de baja."""
    items, total = await configuracion.listar_destinos(
        sesion,
        actor,
        activo=activo,
        buscar=buscar,
        desplazamiento=pagina.desplazamiento,
        limite=pagina.por_pagina,
    )
    return Pagina(
        items=[Destino.model_validate(d) for d in items],
        total=total,
        pagina=pagina.pagina,
        por_pagina=pagina.por_pagina,
    )


@router.post(
    "/destinos",
    status_code=201,
    operation_id="crear_destino",
    summary="Dar de alta un destino",
    **operacion(GESTION, "CU-26", 409, 422),
)
async def crear_destino(datos: DestinoCrear, actor: ActorDep, sesion: SesionDep) -> Destino:
    destino = await configuracion.crear_destino(sesion, actor, **datos.model_dump())
    return Destino.model_validate(destino)


@router.get(
    "/destinos/{destino_id}",
    operation_id="obtener_destino",
    summary="Ver un destino",
    **operacion(TODOS, "CU-26", 404),
)
async def obtener_destino(destino_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Destino:
    return Destino.model_validate(await configuracion.obtener_destino(sesion, actor, destino_id))


@router.patch(
    "/destinos/{destino_id}",
    operation_id="editar_destino",
    summary="Editar un destino",
    **operacion(GESTION, "CU-26", 404, 409, 422),
)
async def editar_destino(
    destino_id: uuid.UUID, datos: DestinoEditar, actor: ActorDep, sesion: SesionDep
) -> Destino:
    cambios = datos.model_dump(exclude_unset=True)
    destino = await configuracion.editar_destino(sesion, actor, destino_id, cambios)
    return Destino.model_validate(destino)


@router.post(
    "/destinos/{destino_id}/baja",
    operation_id="dar_de_baja_destino",
    summary="Dar de baja un destino (baja lógica)",
    **operacion(GESTION, "CU-26", 404),
)
async def dar_de_baja_destino(destino_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Destino:
    destino = await configuracion.dar_de_baja_destino(sesion, actor, destino_id)
    return Destino.model_validate(destino)


@router.post(
    "/destinos/{destino_id}/reactivar",
    operation_id="reactivar_destino",
    summary="Reactivar un destino",
    **operacion(GESTION, "CU-26", 404),
)
async def reactivar_destino(destino_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Destino:
    destino = await configuracion.reactivar_destino(sesion, actor, destino_id)
    return Destino.model_validate(destino)


@router.get(
    "/destinos/{destino_id}/requisitos",
    operation_id="listar_requisitos_destino",
    summary="Listar los requisitos de un destino",
    **operacion(TODOS, "CU-15", 404, 422),
)
async def listar_requisitos_destino(
    destino_id: uuid.UUID, pagina: PaginaDep
) -> Pagina[RequisitoDestino]:
    raise no_implementado()


@router.post(
    "/destinos/{destino_id}/requisitos",
    status_code=201,
    operation_id="crear_requisito_destino",
    summary="Agregar un requisito a un destino",
    **operacion(GESTION, "CU-15", 404, 422),
)
async def crear_requisito_destino(
    destino_id: uuid.UUID, datos: RequisitoDestinoCrear
) -> RequisitoDestino:
    raise no_implementado()


@router.patch(
    "/requisitos-destino/{requisito_id}",
    operation_id="editar_requisito_destino",
    summary="Editar un requisito",
    **operacion(GESTION, "CU-15", 404, 422),
)
async def editar_requisito_destino(
    requisito_id: uuid.UUID, datos: RequisitoDestinoEditar
) -> RequisitoDestino:
    raise no_implementado()


@router.post(
    "/requisitos-destino/{requisito_id}/baja",
    operation_id="dar_de_baja_requisito_destino",
    summary="Quitar un requisito (baja lógica)",
    **operacion(GESTION, "CU-15", 404),
)
async def dar_de_baja_requisito_destino(requisito_id: uuid.UUID) -> RequisitoDestino:
    raise no_implementado()


@router.get(
    "/operadores",
    operation_id="listar_operadores",
    summary="Listar operadores",
    **operacion(TODOS, "CU-31", 422),
)
async def listar_operadores(
    pagina: PaginaDep, activo: bool | None = None, buscar: str | None = None
) -> Pagina[Operador]:
    raise no_implementado()


@router.post(
    "/operadores",
    status_code=201,
    operation_id="crear_operador",
    summary="Dar de alta un operador",
    **operacion(GESTION, "CU-31", 409, 422),
)
async def crear_operador(datos: OperadorCrear) -> Operador:
    raise no_implementado()


@router.get(
    "/operadores/{operador_id}",
    operation_id="obtener_operador",
    summary="Ver un operador",
    **operacion(TODOS, "CU-31", 404),
)
async def obtener_operador(operador_id: uuid.UUID) -> Operador:
    raise no_implementado()


@router.patch(
    "/operadores/{operador_id}",
    operation_id="editar_operador",
    summary="Editar un operador",
    **operacion(GESTION, "CU-31", 404, 409, 422),
)
async def editar_operador(operador_id: uuid.UUID, datos: OperadorEditar) -> Operador:
    raise no_implementado()


@router.post(
    "/operadores/{operador_id}/baja",
    operation_id="dar_de_baja_operador",
    summary="Dar de baja un operador (baja lógica)",
    **operacion(GESTION, "CU-31", 404),
)
async def dar_de_baja_operador(operador_id: uuid.UUID) -> Operador:
    raise no_implementado()


@router.post(
    "/operadores/{operador_id}/reactivar",
    operation_id="reactivar_operador",
    summary="Reactivar un operador",
    **operacion(GESTION, "CU-31", 404),
)
async def reactivar_operador(operador_id: uuid.UUID) -> Operador:
    raise no_implementado()
