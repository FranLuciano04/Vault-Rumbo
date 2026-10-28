"""Rutas del módulo hoteles (CU-16, CU-17, CU-18, CU-29). Stubs: responden 501 hasta su backend."""

import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query

from rumbo.datos.modelos import EstadoHotel, EstadoResena, RolUsuario
from rumbo.presentacion.contrato import (
    GESTION,
    TODOS,
    no_implementado,
    operacion,
    respuesta_pagina,
)
from rumbo.presentacion.esquemas.comunes import Importe
from rumbo.presentacion.esquemas.hoteles import (
    Hotel,
    HotelCrear,
    HotelEditar,
    ProblemaHotelDuplicado,
    Resena,
    ResenaCrear,
    ResenaEditar,
    ResenaOcultar,
)
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(tags=["hoteles"])

PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]

# El catálogo es compartido: lo gestionan todos menos el freelance, que solo consulta (DEC-0008).
CATALOGO = (RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado)


def _con_duplicado(operacion_hotel: dict[str, Any]) -> dict[str, Any]:
    """Cambia el `409` por el que trae el hotel existente, para ofrecer abrirlo (CU-16 A2)."""
    operacion_hotel["responses"][409] = {
        "model": ProblemaHotelDuplicado,
        "description": "Ya existe un hotel con ese nombre en el destino (CU-16 A2).",
    }
    return operacion_hotel


_LISTADO_HOTELES = operacion(TODOS, "CU-18", 422)
_LISTADO_HOTELES["responses"][200] = respuesta_pagina(
    "Hotel", "Hoteles del catálogo, con su puntaje promedio. Por defecto, solo los activos."
)
_LISTADO_RESENAS = operacion(TODOS, "CU-18", 403, 404, 422)
_LISTADO_RESENAS["description"] += (
    "\n\n**Reseñas ocultas:** solo admin y dueño ven las `oculta` (`estado=oculta`); "
    "para el resto es 403."
)
_LISTADO_RESENAS["responses"][200] = respuesta_pagina(
    "Resena",
    "Reseñas del hotel, de la más reciente a la más antigua. Por defecto, solo las publicadas.",
)


@router.get(
    "/hoteles",
    operation_id="listar_hoteles",
    summary="Buscar y recomendar hoteles",
    response_model=None,
    **_LISTADO_HOTELES,
)
async def listar_hoteles(
    paginacion: PaginaDep,
    destino_id: Annotated[uuid.UUID | None, Query()] = None,
    categoria: Annotated[str | None, Query()] = None,
    precio_max: Annotated[
        Importe | None, Query(description="Precio de referencia máximo, inclusive.")
    ] = None,
    servicio: Annotated[
        str | None, Query(description="Servicio que el hotel debe ofrecer.")
    ] = None,
    orden: Annotated[
        Literal["nombre", "valoracion", "precio"],
        Query(description="`valoracion` ordena por puntaje promedio, de mayor a menor (CU-18 A2)."),
    ] = "nombre",
    estado: Annotated[
        EstadoHotel,
        Query(description="Los `cerrado` se conservan pero salen del catálogo activo (CU-16 A4)."),
    ] = EstadoHotel.activo,
) -> Pagina[Hotel]:
    raise no_implementado()


@router.post(
    "/hoteles",
    operation_id="crear_hotel",
    summary="Dar de alta un hotel",
    status_code=201,
    **_con_duplicado(operacion(CATALOGO, "CU-16", 409, 422)),
)
async def crear_hotel(datos: HotelCrear) -> Hotel:
    raise no_implementado()


@router.get(
    "/hoteles/{hotel_id}",
    operation_id="obtener_hotel",
    summary="Ver un hotel",
    **operacion(TODOS, "CU-18", 404),
)
async def obtener_hotel(hotel_id: uuid.UUID) -> Hotel:
    raise no_implementado()


@router.patch(
    "/hoteles/{hotel_id}",
    operation_id="editar_hotel",
    summary="Editar un hotel",
    **_con_duplicado(operacion(CATALOGO, "CU-16", 404, 409, 422)),
)
async def editar_hotel(hotel_id: uuid.UUID, cambios: HotelEditar) -> Hotel:
    raise no_implementado()


@router.post(
    "/hoteles/{hotel_id}/baja",
    operation_id="dar_de_baja_hotel",
    summary="Dar de baja un hotel que cerró",
    **operacion(CATALOGO, "CU-16", 404, 409),
)
async def dar_de_baja_hotel(hotel_id: uuid.UUID) -> Hotel:
    """Baja lógica: el hotel pasa a `cerrado` y conserva su historial."""
    raise no_implementado()


@router.get(
    "/hoteles/{hotel_id}/resenas",
    operation_id="listar_resenas",
    summary="Ver las reseñas de un hotel",
    response_model=None,
    **_LISTADO_RESENAS,
)
async def listar_resenas(
    hotel_id: uuid.UUID,
    paginacion: PaginaDep,
    estado: Annotated[
        EstadoResena,
        Query(description="Las `oculta` solo las ven admin y dueño, para restaurarlas (CU-29 A1)."),
    ] = EstadoResena.publicada,
) -> Pagina[Resena]:
    raise no_implementado()


@router.post(
    "/hoteles/{hotel_id}/resenas",
    operation_id="registrar_resena",
    summary="Registrar la reseña de un cliente",
    status_code=201,
    **operacion(CATALOGO, "CU-17", 404, 422),
)
async def registrar_resena(hotel_id: uuid.UUID, datos: ResenaCrear) -> Resena:
    raise no_implementado()


@router.patch(
    "/resenas/{resena_id}",
    operation_id="editar_resena",
    summary="Editar una reseña",
    **operacion(CATALOGO, "CU-17", 404, 409, 422),
)
async def editar_resena(resena_id: uuid.UUID, cambios: ResenaEditar) -> Resena:
    """Corrige puntaje, comentario o fecha (RF-105); no la mueve de hotel ni de cliente."""
    raise no_implementado()


@router.post(
    "/resenas/{resena_id}/ocultar",
    operation_id="ocultar_resena",
    summary="Eliminar una reseña (baja lógica)",
    **operacion(GESTION, "CU-29", 404, 409, 422),
)
async def ocultar_resena(resena_id: uuid.UUID, datos: ResenaOcultar) -> Resena:
    """La reseña pasa a `oculta` y deja de contar para la recomendación."""
    raise no_implementado()


@router.post(
    "/resenas/{resena_id}/restaurar",
    operation_id="restaurar_resena",
    summary="Restaurar una reseña oculta",
    **operacion(GESTION, "CU-29", 404, 409),
)
async def restaurar_resena(resena_id: uuid.UUID) -> Resena:
    raise no_implementado()


@router.delete(
    "/resenas/{resena_id}",
    operation_id="eliminar_resena",
    summary="Eliminar una reseña físicamente (excepcional)",
    status_code=204,
    **operacion(GESTION, "CU-29", 404, 409),
)
async def eliminar_resena(resena_id: uuid.UUID) -> None:
    """Solo si no rompe la integridad referencial; por defecto se oculta (CU-29 A2)."""
    raise no_implementado()
