"""Ajustes del documento OpenAPI que FastAPI no genera solo."""

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from rumbo.presentacion.errores import PROBLEM_JSON
from rumbo.presentacion.esquemas.comunes import Problema
from rumbo.presentacion.paginacion import Pagina

_REF_PROBLEMA = "#/components/schemas/Problema"
_REF_VALIDACION = "#/components/schemas/HTTPValidationError"


def _es_error(estado: str) -> bool:
    return estado in {"default", "4XX", "5XX"} or (estado.isdigit() and int(estado) >= 400)


def _errores_como_problem_json(documento: dict[str, Any]) -> None:
    """Toda respuesta de error del contrato va en `application/problem+json`: con `Problema`,
    o con el esquema que lo extiende si la operación declaró uno (p. ej. `ProblemaDuplicado`);
    el 422 automático de FastAPI (`HTTPValidationError`) pasa a `Problema`."""
    for operaciones in documento["paths"].values():
        for operacion in operaciones.values():
            for estado, respuesta in operacion["responses"].items():
                contenido = respuesta.get("content")
                if _es_error(estado) and contenido:
                    esquema = next(iter(contenido.values())).get("schema", {"$ref": _REF_PROBLEMA})
                    if esquema.get("$ref") == _REF_VALIDACION:
                        esquema = {"$ref": _REF_PROBLEMA}
                    respuesta["content"] = {PROBLEM_JSON: {"schema": esquema}}


def _publicar_problema(documento: dict[str, Any]) -> None:
    """Garantiza `Problema` y `ErrorCampo` en components aunque ninguna ruta los declare."""
    esquema = Problema.model_json_schema(ref_template="#/components/schemas/{model}")
    esquemas = documento["components"].setdefault("schemas", {})
    esquemas.update(esquema.pop("$defs", {}))
    esquema.pop("title", None)
    esquemas["Problema"] = esquema


def _quitar_esquemas_de_validacion_de_fastapi(documento: dict[str, Any]) -> None:
    """`HTTPValidationError` y `ValidationError` quedan huérfanos: el 422 usa `Problema`."""
    esquemas = documento["components"]["schemas"]
    for nombre in ("HTTPValidationError", "ValidationError"):
        esquemas.pop(nombre, None)


def _publicar_pagina_generica(documento: dict[str, Any]) -> None:
    """Publica `Pagina` (items, total, pagina, por_pagina) para que los listados la reutilicen."""
    esquema = Pagina[Any].model_json_schema(ref_template="#/components/schemas/{model}")
    esquema.pop("title", None)
    documento["components"]["schemas"]["Pagina"] = esquema


def registrar_openapi(app: FastAPI) -> None:
    def generar() -> dict[str, Any]:
        if app.openapi_schema is None:
            documento = get_openapi(title=app.title, version=app.version, routes=app.routes)
            _publicar_problema(documento)
            _errores_como_problem_json(documento)
            _quitar_esquemas_de_validacion_de_fastapi(documento)
            _publicar_pagina_generica(documento)
            app.openapi_schema = documento
        return app.openapi_schema

    app.openapi = generar  # type: ignore[method-assign]
