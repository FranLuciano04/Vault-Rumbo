"""Ajustes del documento OpenAPI que FastAPI no genera solo."""

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from rumbo.presentacion.errores import PROBLEM_JSON
from rumbo.presentacion.paginacion import Pagina


def _errores_como_problem_json(documento: dict[str, Any]) -> None:
    """Las respuestas de error del contrato son `application/problem+json`."""
    for operaciones in documento["paths"].values():
        for operacion in operaciones.values():
            for estado, respuesta in operacion["responses"].items():
                contenido = respuesta.get("content", {})
                if int(estado) >= 400 and "application/json" in contenido:
                    contenido[PROBLEM_JSON] = contenido.pop("application/json")


def _publicar_pagina_generica(documento: dict[str, Any]) -> None:
    """Publica `Pagina` (items, total, pagina, por_pagina) para que los listados la reutilicen."""
    esquema = Pagina[Any].model_json_schema(ref_template="#/components/schemas/{model}")
    esquema.pop("title", None)
    documento["components"]["schemas"]["Pagina"] = esquema


def registrar_openapi(app: FastAPI) -> None:
    def generar() -> dict[str, Any]:
        if app.openapi_schema is None:
            documento = get_openapi(title=app.title, version=app.version, routes=app.routes)
            _errores_como_problem_json(documento)
            _publicar_pagina_generica(documento)
            app.openapi_schema = documento
        return app.openapi_schema

    app.openapi = generar  # type: ignore[method-assign]
