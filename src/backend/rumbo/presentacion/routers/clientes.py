"""Rutas del módulo clientes (CU-02, CU-03). Stubs: responden 501 hasta el ticket de backend."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.datos.modelos import SegmentoCliente
from rumbo.negocio.servicios import clientes
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.errores import no_implementado
from rumbo.presentacion.esquemas.clientes import (
    Cliente,
    ClienteCrear,
    ClienteEditar,
    HistorialCliente,
    ProblemaDuplicado,
)
from rumbo.presentacion.esquemas.comunes import Problema
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(
    prefix="/clientes",
    tags=["clientes"],
    dependencies=[Depends(usuario_actual)],
    responses={
        401: {
            "model": Problema,
            "description": "Falta el token, no es válido o el usuario no tiene acceso.",
        },
    },
)

_ROLES = "**Roles:** admin, dueno, empleado, freelance."
_NO_ENCONTRADO: dict[int | str, dict[str, Any]] = {
    404: {"model": Problema, "description": "El cliente no existe o no lo podés ver."}
}


@router.get(
    "",
    operation_id="buscar_clientes",
    summary="Buscar clientes",
    description=f"{_ROLES}\n\n**Casos de uso:** CU-03.",
)
async def buscar_clientes(
    paginacion: Annotated[ParametrosPagina, Depends(parametros_pagina)],
    buscar: Annotated[str | None, Query(description="Texto en el nombre o el contacto.")] = None,
    etiqueta: Annotated[str | None, Query(description="Etiqueta exacta del cliente.")] = None,
    segmento: Annotated[SegmentoCliente | None, Query(description="Segmento del cliente.")] = None,
    mios: Annotated[bool, Query(description="Solo los clientes que tengo asignados.")] = False,
) -> Pagina[Cliente]:
    raise no_implementado()


@router.post(
    "",
    operation_id="registrar_cliente",
    summary="Registrar un cliente",
    description=(
        f"{_ROLES}\n\n**Casos de uso:** CU-02.\n\nSi hay un posible duplicado responde `409` "
        "con los clientes parecidos; se reintenta con `confirmar_duplicado: true` (CU-02 A1)."
    ),
    status_code=201,
    responses={
        409: {"model": ProblemaDuplicado, "description": "Posible cliente duplicado (CU-02 A1)."}
    },
)
async def registrar_cliente(
    datos: ClienteCrear,
    actor: Annotated[modelos.Usuario, Depends(usuario_actual)],
    sesion: SesionDep,
) -> Cliente:
    cliente = await clientes.registrar_cliente(sesion, actor, **datos.model_dump())
    return Cliente.model_validate(cliente)


@router.get(
    "/{cliente_id}",
    operation_id="obtener_cliente",
    summary="Ver la ficha de un cliente",
    description=f"{_ROLES}\n\n**Casos de uso:** CU-03.",
    responses=_NO_ENCONTRADO,
)
async def obtener_cliente(cliente_id: uuid.UUID) -> Cliente:
    raise no_implementado()


@router.patch(
    "/{cliente_id}",
    operation_id="editar_cliente",
    summary="Editar la ficha de un cliente",
    description=f"{_ROLES}\n\n**Casos de uso:** CU-03, CU-30.",
    responses=_NO_ENCONTRADO,
)
async def editar_cliente(cliente_id: uuid.UUID, cambios: ClienteEditar) -> Cliente:
    raise no_implementado()


@router.get(
    "/{cliente_id}/historial",
    operation_id="obtener_historial_cliente",
    summary="Historial del cliente: oportunidades, viajes y reseñas",
    description=f"{_ROLES}\n\n**Casos de uso:** CU-03.",
    responses=_NO_ENCONTRADO,
)
async def obtener_historial_cliente(cliente_id: uuid.UUID) -> HistorialCliente:
    raise no_implementado()
