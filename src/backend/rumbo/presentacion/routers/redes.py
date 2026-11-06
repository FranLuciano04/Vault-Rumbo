"""Rutas del módulo redes (CU-19, CU-20). Son stubs que responden 501."""

import uuid
from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from rumbo.datos.modelos import CanalContenido, EstadoKanban, RolUsuario
from rumbo.presentacion.contrato import no_implementado, operacion, respuesta_pagina
from rumbo.presentacion.dependencias import exigir_acceso_redes
from rumbo.presentacion.esquemas.comunes import Problema
from rumbo.presentacion.esquemas.redes import (
    ContenidoRed,
    ContenidoRedCrear,
    ContenidoRedEditar,
    PropuestaIA,
    PropuestaIAPedido,
)
from rumbo.presentacion.paginacion import Pagina, ParametrosPagina, parametros_pagina

router = APIRouter(tags=["redes"])

PaginaDep = Annotated[ParametrosPagina, Depends(parametros_pagina)]

# El freelance no usa el módulo, tenga o no la capacidad; el resto, solo con acceso a redes
# (DEC-0008, DEC-0013).
CON_ACCESO_A_REDES = (RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado)


def _redes(casos_de_uso: str, *errores: int) -> dict[str, Any]:
    """`operacion` del módulo: roles con acceso y, además, la capacidad de redes."""
    contrato = operacion(CON_ACCESO_A_REDES, casos_de_uso, *errores)
    contrato["dependencies"].append(Depends(exigir_acceso_redes))
    contrato["description"] += (
        "\n\nRequiere acceso al módulo de redes: admin y dueño lo tienen por rol; el empleado, "
        "si se lo habilitaron (`acceso_redes`). Sin él, 403."
    )
    return contrato


def _con_falla_de_ia(contrato: dict[str, Any]) -> dict[str, Any]:
    contrato["responses"][502] = {
        "model": Problema,
        "description": "Falló el servicio de IA o no respondió a tiempo (DEC-0012); no se "
        "genera ningún borrador y se puede reintentar (CU-20).",
    }
    return contrato


def _con_descripcion(contrato: dict[str, Any], texto: str) -> dict[str, Any]:
    contrato["description"] += f"\n\n{texto}"
    return contrato


_LISTADO = _con_descripcion(
    _redes("CU-19", 422),
    "Sin `estado_kanban` no trae las piezas `descartado`; "
    "con `estado_kanban=descartado` las muestra.",
)
_LISTADO["responses"][200] = respuesta_pagina(
    "ContenidoRed", "Piezas del tablero, de la fecha de publicación más próxima a la más lejana."
)


@router.get(
    "/contenidos",
    operation_id="listar_contenidos",
    summary="Ver el tablero y el calendario de contenido",
    response_model=None,
    **_LISTADO,
)
async def listar_contenidos(
    paginacion: PaginaDep,
    desde: Annotated[
        date | None, Query(description="Fecha de publicación desde la que se listan, inclusive.")
    ] = None,
    hasta: Annotated[
        date | None, Query(description="Fecha de publicación hasta la que se listan, inclusive.")
    ] = None,
    estado_kanban: Annotated[
        EstadoKanban | None, Query(description="Solo las piezas de esa columna.")
    ] = None,
    canal: Annotated[CanalContenido | None, Query(description="Solo ese canal.")] = None,
) -> Pagina[ContenidoRed]:
    raise no_implementado()


@router.post(
    "/contenidos",
    operation_id="crear_contenido",
    summary="Crear una pieza de contenido",
    status_code=201,
    **_redes("CU-19, CU-20", 422),
)
async def crear_contenido(datos: ContenidoRedCrear) -> ContenidoRed:
    raise no_implementado()


@router.post(
    "/contenidos/propuestas-ia",
    operation_id="generar_propuesta_ia",
    summary="Generar borradores de contenido con IA",
    **_con_falla_de_ia(
        _con_descripcion(
            _redes("CU-20", 422),
            "Una sola llamada a Claude Sonnet 5.5 con el tema, el canal y el tono indicados; "
            "no envía datos del negocio (clientes, catálogo ni ventas).",
        )
    ),
)
async def generar_propuesta_ia(datos: PropuestaIAPedido) -> PropuestaIA:
    """No guarda nada: devuelve borradores para que la persona los revise y guarde el elegido."""
    raise no_implementado()


@router.get(
    "/contenidos/{contenido_id}",
    operation_id="obtener_contenido",
    summary="Ver una pieza de contenido",
    **_redes("CU-19", 404),
)
async def obtener_contenido(contenido_id: uuid.UUID) -> ContenidoRed:
    raise no_implementado()


@router.patch(
    "/contenidos/{contenido_id}",
    operation_id="editar_contenido",
    summary="Editar, reprogramar o mover una pieza en el tablero",
    **_con_descripcion(
        _redes("CU-19, CU-20", 404, 409, 422),
        "Movimientos válidos: idea con en producción, en producción con listo, y listo a "
        "publicado; cualquier otro cambio de estado da 409. Una pieza `publicado` o "
        "`descartado` no admite ningún cambio, ni de fecha. `descartado` no se alcanza por "
        "acá: solo con `/descartar`.",
    ),
)
async def editar_contenido(contenido_id: uuid.UUID, cambios: ContenidoRedEditar) -> ContenidoRed:
    raise no_implementado()


@router.post(
    "/contenidos/{contenido_id}/descartar",
    operation_id="descartar_contenido",
    summary="Descartar una pieza (baja lógica)",
    **_redes("CU-19", 404, 409),
)
async def descartar_contenido(contenido_id: uuid.UUID) -> ContenidoRed:
    """Pasa a `descartado` desde cualquier columna previa a `publicado` (CU-19 A4)."""
    raise no_implementado()
