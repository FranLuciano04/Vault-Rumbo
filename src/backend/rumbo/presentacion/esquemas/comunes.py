"""Esquemas comunes del contrato: el error problem+json (RFC 9457) y su detalle por campo."""

from typing import Literal

from pydantic import BaseModel

TipoComision = Literal["importe", "porcentaje"]  # el porcentaje es sobre la ganancia (DEC-0007)


class ErrorCampo(BaseModel):
    campo: str
    mensaje: str


class Problema(BaseModel):
    title: str
    status: int
    detail: str | None = None
    errores: list[ErrorCampo] | None = None
