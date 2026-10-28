"""Piezas comunes de las rutas del contrato: roles, errores declarados y el stub `501`."""

from typing import Any

from fastapi import Depends, HTTPException

from rumbo.datos.modelos import RolUsuario
from rumbo.presentacion.dependencias import exigir_roles, usuario_actual
from rumbo.presentacion.esquemas.comunes import Problema

TODOS = (RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado, RolUsuario.freelance)
GESTION = (RolUsuario.admin, RolUsuario.dueno)

_ESCRITURA = "**Escritura:** el responsable de la alerta, o admin o dueño (DEC-0005).\n\n"
_VISIBILIDAD = "**Visibilidad:** freelance, solo lo propio (DEC-0008).\n\n"
ESCRITURA_DEL_REGISTRO = "el responsable del registro, o admin o dueño (DEC-0005)."
_ERRORES = {
    401: "Falta el token, no es válido o el usuario no tiene acceso.",
    403: "El rol no alcanza.",
    404: "No existe.",
    409: "Conflicto con el estado actual.",
    422: "Datos inválidos.",
}


def _regla(escritura: bool | str) -> str:
    return f"**Escritura:** {escritura}\n\n" if escritura else ""


def respuesta_pagina(
    esquema: str, descripcion: str, extras: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Respuesta `200` de un listado paginado con `esquema` por referencia, como el contrato (no
    el `Pagina_X_` que genera FastAPI). Va en `responses[200]`; la ruta lleva `response_model=None`.
    `extras` suma propiedades opcionales a la página (p. ej. `alternativas` en los hoteles).
    """
    return {
        "description": descripcion,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {"$ref": f"#/components/schemas/{esquema}"},
                        },
                        "total": {
                            "type": "integer",
                            "description": "Cantidad total de resultados.",
                        },
                        "pagina": {"type": "integer", "minimum": 1},
                        "por_pagina": {"type": "integer", "minimum": 1, "maximum": 100},
                        **(extras or {}),
                    },
                    "required": ["items", "total", "pagina", "por_pagina"],
                }
            }
        },
    }


def operacion(
    roles: tuple[RolUsuario, ...],
    casos_de_uso: str,
    *errores: int,
    escritura: bool | str = False,
    visibilidad: bool = False,
) -> dict[str, Any]:
    """Argumentos de ruta comunes: guardia de rol, descripción (`Roles` y `Casos de uso`) y las
    respuestas de error problem+json (`401` siempre, `403` si no es para todos, más `errores`).
    Con `escritura`, la descripción suma la regla de DEC-0005 (responsable, admin o dueño);
    si es un texto, suma ese en su lugar (una regla de escritura más estricta). Con `visibilidad`,
    suma que el `freelance` ve solo lo propio (DEC-0008)."""
    regla = (_VISIBILIDAD if visibilidad else "") + (
        _ESCRITURA if escritura is True else _regla(escritura)
    )
    codigos = [401, *([403] if roles != TODOS else []), *errores]
    return {
        "dependencies": [Depends(usuario_actual if roles == TODOS else exigir_roles(*roles))],
        "description": (
            f"**Roles:** {', '.join(r.value for r in roles)}.\n\n"
            f"{regla}**Casos de uso:** {casos_de_uso}."
        ),
        "openapi_extra": {
            "x-roles": [r.value for r in roles],
            "x-casos-de-uso": casos_de_uso.split(", "),
        },
        "responses": {c: {"model": Problema, "description": _ERRORES[c]} for c in codigos},
    }


def no_implementado() -> HTTPException:
    """Cuerpo de los stubs del ticket de contrato: la lógica llega con los tickets de backend."""
    return HTTPException(status_code=501, detail="Todavía no está implementado.")


def operacion_de_registro(
    *errores: int, casos_de_uso: str, escritura: bool = True
) -> dict[str, Any]:
    """`operacion` de una ruta sobre un registro con responsable (oportunidad, cotización, viaje o
    pago), para todos los roles: suma la visibilidad del `freelance` (DEC-0008) y, si `escritura`,
    que escribe el responsable del registro, o admin o dueño (DEC-0005)."""
    return operacion(
        TODOS,
        casos_de_uso,
        *errores,
        visibilidad=True,
        escritura=ESCRITURA_DEL_REGISTRO if escritura else False,
    )
