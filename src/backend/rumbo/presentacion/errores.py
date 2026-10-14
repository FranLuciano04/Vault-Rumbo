import logging
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from rumbo.negocio.errores import (
    Conflicto,
    ErrorDeDominio,
    NoEncontrado,
    ServicioExterno,
    SinPermiso,
    TransicionInvalida,
)

logger = logging.getLogger(__name__)

PROBLEM_JSON = "application/problem+json"

_TITULOS = {
    400: "Solicitud incorrecta",
    401: "No autenticado",
    403: "Sin permiso",
    404: "No encontrado",
    405: "Método no permitido",
    409: "Conflicto",
    422: "Datos inválidos",
    500: "Error interno",
    502: "Servicio externo no disponible",
}

_ESTADO_POR_DOMINIO: dict[type[ErrorDeDominio], int] = {
    NoEncontrado: 404,
    SinPermiso: 403,
    TransicionInvalida: 409,
    Conflicto: 409,
    ServicioExterno: 502,
}


def _problema(estado: int, detalle: str, **extra: Any) -> JSONResponse:
    cuerpo = {"title": _TITULOS.get(estado, "Error"), "status": estado, "detail": detalle, **extra}
    return JSONResponse(cuerpo, status_code=estado, media_type=PROBLEM_JSON)


def _estado_de_dominio(error: ErrorDeDominio) -> int | None:
    for clase, estado in _ESTADO_POR_DOMINIO.items():
        if isinstance(error, clase):
            return estado
    return None


async def _error_de_dominio(request: Request, exc: Exception) -> JSONResponse:
    error = cast(ErrorDeDominio, exc)
    estado = _estado_de_dominio(error)
    if estado is None:
        return await _error_no_controlado(request, exc)
    return _problema(estado, error.detalle)


async def _error_http(_: Request, exc: Exception) -> JSONResponse:
    error = cast(StarletteHTTPException, exc)
    detalle = (
        error.detail if isinstance(error.detail, str) else _TITULOS.get(error.status_code, "Error")
    )
    response = _problema(error.status_code, detalle)
    if error.headers:
        response.headers.update(error.headers)
    return response


async def _error_de_validacion(_: Request, exc: Exception) -> JSONResponse:
    errores = jsonable_encoder(
        cast(RequestValidationError, exc).errors(), exclude={"input", "ctx", "url"}
    )
    return _problema(422, "Los datos enviados no son válidos.", errores=errores)


async def _error_no_controlado(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Error no controlado", exc_info=exc)
    return _problema(500, "Ocurrió un error inesperado.")


def registrar_manejadores(app: FastAPI) -> None:
    app.add_exception_handler(ErrorDeDominio, _error_de_dominio)
    app.add_exception_handler(StarletteHTTPException, _error_http)
    app.add_exception_handler(RequestValidationError, _error_de_validacion)
    app.add_exception_handler(Exception, _error_no_controlado)
