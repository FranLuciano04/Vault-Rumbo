"""Esquemas comunes del contrato: el error problem+json (RFC 9457) y su detalle por campo."""

from pydantic import BaseModel


class ErrorCampo(BaseModel):
    campo: str
    mensaje: str


class Problema(BaseModel):
    title: str
    status: int
    detail: str | None = None
    errores: list[ErrorCampo] | None = None
