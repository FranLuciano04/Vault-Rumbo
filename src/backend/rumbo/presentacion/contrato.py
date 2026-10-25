"""Piezas comunes de las rutas del contrato: roles, errores declarados y el stub `501`."""

from typing import Any

from fastapi import Depends, HTTPException

from rumbo.datos.modelos import RolUsuario
from rumbo.presentacion.dependencias import exigir_roles, usuario_actual
from rumbo.presentacion.esquemas.comunes import Problema

TODOS = (RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado, RolUsuario.freelance)
GESTION = (RolUsuario.admin, RolUsuario.dueno)

_ESCRITURA = "**Escritura:** el responsable de la alerta, o admin o dueño (DEC-0005).\n\n"
_ERRORES = {
    401: "Falta el token, no es válido o el usuario no tiene acceso.",
    403: "El rol no alcanza.",
    404: "No existe.",
    409: "Conflicto con el estado actual.",
    422: "Datos inválidos.",
}


def _regla(escritura: bool | str) -> str:
    return f"**Escritura:** {escritura}\n\n" if escritura else ""


def operacion(
    roles: tuple[RolUsuario, ...],
    casos_de_uso: str,
    *errores: int,
    escritura: bool | str = False,
) -> dict[str, Any]:
    """Argumentos de ruta comunes: guardia de rol, descripción (`Roles` y `Casos de uso`) y las
    respuestas de error problem+json (`401` siempre, `403` si no es para todos, más `errores`).
    Con `escritura`, la descripción suma la regla de DEC-0005 (responsable, admin o dueño);
    si es un texto, suma ese en su lugar (una regla de escritura más estricta)."""
    regla = _ESCRITURA if escritura is True else _regla(escritura)
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
