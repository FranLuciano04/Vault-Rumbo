"""Visibilidad por fila y permisos por rol (DEC-0005, DEC-0008). Stub de T-012."""

from typing import Any

from sqlalchemy import Select

from rumbo.datos.modelos import RolUsuario, Usuario


class FiltroVisibilidad:
    def aplicar[S: Select[Any]](self, consulta: S, modelo: type) -> S:
        raise NotImplementedError


def visibilidad(actor: Usuario) -> FiltroVisibilidad:
    raise NotImplementedError


def exigir_rol(actor: Usuario, *roles: RolUsuario) -> None:
    raise NotImplementedError


def exigir_escritura(actor: Usuario, registro: Any) -> None:
    raise NotImplementedError
