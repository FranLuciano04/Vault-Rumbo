"""Rutas del módulo hoteles (CU-16, CU-17, CU-18, CU-29)."""

import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query

from rumbo.core.db import SesionDep
from rumbo.datos import modelos
from rumbo.datos.modelos import EstadoHotel, EstadoResena, RolUsuario
from rumbo.negocio.errores import HotelDuplicado
from rumbo.negocio.servicios import hoteles, resenas
from rumbo.negocio.servicios.hoteles import HotelConResenas
from rumbo.presentacion.contrato import (
    GESTION,
    TODOS,
    operacion,
    respuesta_pagina,
)
from rumbo.presentacion.dependencias import usuario_actual
from rumbo.presentacion.esquemas.comunes import Importe
from rumbo.presentacion.esquemas.hoteles import (
    AlternativasHoteles,
    Hotel,
    HotelCrear,
    HotelEditar,
    HotelExistente,
    PaginaHoteles,
    ProblemaHotelDuplicado,
    Resena,
    ResenaCrear,
    ResenaEditar,
    ResenaOcultar,
)
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(tags=["hoteles"])

ActorDep = Annotated[modelos.Usuario, Depends(usuario_actual)]
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


def _con_existente(error: HotelDuplicado) -> HotelDuplicado:
    """Vuelca el hotel que ya existe en el `409`, para ofrecer abrirlo."""
    existente = error.existente
    error.extra = {"existente": HotelExistente(id=existente.id, nombre=existente.nombre)}
    return error


def _hotel(resultado: HotelConResenas) -> Hotel:
    return Hotel.desde_modelo(*resultado)


_LISTADO_HOTELES = operacion(TODOS, "CU-18", 422)
_LISTADO_HOTELES["responses"][200] = respuesta_pagina(
    "Hotel",
    "Hoteles del catálogo, con su puntaje promedio. Por defecto, solo los activos.",
    extras={
        "alternativas": {
            "anyOf": [{"$ref": "#/components/schemas/AlternativasHoteles"}, {"type": "null"}],
            "description": "Solo si no hubo ningún resultado (CU-18 A1): qué filtros ampliar y "
            "si se puede dar de alta el hotel.",
        }
    },
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
    actor: ActorDep,
    sesion: SesionDep,
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
) -> PaginaHoteles:
    resultado = await hoteles.buscar_hoteles(
        sesion,
        actor,
        destino_id=destino_id,
        categoria=categoria,
        precio_max=precio_max,
        servicio=servicio,
        orden=orden,
        estado=estado,
        desplazamiento=paginacion.desplazamiento,
        limite=paginacion.por_pagina,
    )
    return PaginaHoteles(
        items=[_hotel(h) for h in resultado.hoteles],
        total=resultado.total,
        pagina=paginacion.pagina,
        por_pagina=paginacion.por_pagina,
        alternativas=(
            AlternativasHoteles(**resultado.alternativas._asdict())
            if resultado.alternativas
            else None
        ),
    )


@router.post(
    "/hoteles",
    operation_id="crear_hotel",
    summary="Dar de alta un hotel",
    status_code=201,
    **_con_duplicado(operacion(CATALOGO, "CU-16", 409, 422)),
)
async def crear_hotel(datos: HotelCrear, actor: ActorDep, sesion: SesionDep) -> Hotel:
    try:
        return _hotel(await hoteles.crear_hotel(sesion, actor, **datos.model_dump()))
    except HotelDuplicado as error:
        raise _con_existente(error) from None


@router.get(
    "/hoteles/{hotel_id}",
    operation_id="obtener_hotel",
    summary="Ver un hotel",
    **operacion(TODOS, "CU-18", 404),
)
async def obtener_hotel(hotel_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Hotel:
    return _hotel(await hoteles.obtener_hotel(sesion, actor, hotel_id))


@router.patch(
    "/hoteles/{hotel_id}",
    operation_id="editar_hotel",
    summary="Editar un hotel",
    **_con_duplicado(operacion(CATALOGO, "CU-16", 404, 409, 422)),
)
async def editar_hotel(
    hotel_id: uuid.UUID, cambios: HotelEditar, actor: ActorDep, sesion: SesionDep
) -> Hotel:
    try:
        resultado = await hoteles.editar_hotel(
            sesion, actor, hotel_id, cambios.model_dump(exclude_unset=True)
        )
    except HotelDuplicado as error:
        raise _con_existente(error) from None
    return _hotel(resultado)


@router.post(
    "/hoteles/{hotel_id}/baja",
    operation_id="dar_de_baja_hotel",
    summary="Dar de baja un hotel que cerró",
    **operacion(CATALOGO, "CU-16", 404, 409),
)
async def dar_de_baja_hotel(hotel_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Hotel:
    """Baja lógica: el hotel pasa a `cerrado` y conserva su historial."""
    return _hotel(await hoteles.dar_de_baja_hotel(sesion, actor, hotel_id))


@router.get(
    "/hoteles/{hotel_id}/resenas",
    operation_id="listar_resenas",
    summary="Ver las reseñas de un hotel",
    response_model=None,
    **_LISTADO_RESENAS,
)
async def listar_resenas(
    hotel_id: uuid.UUID,
    actor: ActorDep,
    sesion: SesionDep,
    paginacion: PaginaDep,
    estado: Annotated[
        EstadoResena,
        Query(description="Las `oculta` solo las ven admin y dueño, para restaurarlas (CU-29 A1)."),
    ] = EstadoResena.publicada,
) -> Pagina[Resena]:
    items, total = await resenas.listar_resenas(
        sesion,
        actor,
        hotel_id,
        estado=estado,
        desplazamiento=paginacion.desplazamiento,
        limite=paginacion.por_pagina,
    )
    return Pagina(
        items=[Resena.model_validate(r) for r in items],
        total=total,
        pagina=paginacion.pagina,
        por_pagina=paginacion.por_pagina,
    )


@router.post(
    "/hoteles/{hotel_id}/resenas",
    operation_id="registrar_resena",
    summary="Registrar la reseña de un cliente",
    status_code=201,
    **operacion(CATALOGO, "CU-17", 404, 422),
)
async def registrar_resena(
    hotel_id: uuid.UUID, datos: ResenaCrear, actor: ActorDep, sesion: SesionDep
) -> Resena:
    resena = await resenas.registrar_resena(sesion, actor, hotel_id, **datos.model_dump())
    return Resena.model_validate(resena)


@router.patch(
    "/resenas/{resena_id}",
    operation_id="editar_resena",
    summary="Editar una reseña",
    **operacion(CATALOGO, "CU-17", 404, 409, 422),
)
async def editar_resena(
    resena_id: uuid.UUID, cambios: ResenaEditar, actor: ActorDep, sesion: SesionDep
) -> Resena:
    """Corrige puntaje, comentario o fecha (RF-105); no la mueve de hotel ni de cliente."""
    resena = await resenas.editar_resena(
        sesion, actor, resena_id, cambios.model_dump(exclude_unset=True)
    )
    return Resena.model_validate(resena)


@router.post(
    "/resenas/{resena_id}/ocultar",
    operation_id="ocultar_resena",
    summary="Eliminar una reseña (baja lógica)",
    **operacion(GESTION, "CU-29", 404, 409, 422),
)
async def ocultar_resena(
    resena_id: uuid.UUID, datos: ResenaOcultar, actor: ActorDep, sesion: SesionDep
) -> Resena:
    """La reseña pasa a `oculta` y deja de contar para la recomendación."""
    resena = await resenas.ocultar_resena(sesion, actor, resena_id, datos.motivo_baja)
    return Resena.model_validate(resena)


@router.post(
    "/resenas/{resena_id}/restaurar",
    operation_id="restaurar_resena",
    summary="Restaurar una reseña oculta",
    **operacion(GESTION, "CU-29", 404, 409),
)
async def restaurar_resena(resena_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> Resena:
    resena = await resenas.restaurar_resena(sesion, actor, resena_id)
    return Resena.model_validate(resena)


@router.delete(
    "/resenas/{resena_id}",
    operation_id="eliminar_resena",
    summary="Eliminar una reseña físicamente (excepcional)",
    status_code=204,
    **operacion(GESTION, "CU-29", 404, 409),
)
async def eliminar_resena(resena_id: uuid.UUID, actor: ActorDep, sesion: SesionDep) -> None:
    """Solo una reseña ya `oculta`; por defecto se oculta, no se borra (CU-29 A2)."""
    await resenas.eliminar_resena(sesion, actor, resena_id)
