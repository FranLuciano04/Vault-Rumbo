"""Esquemas comunes del contrato: el error problem+json (RFC 9457) y su detalle por campo."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ErrorCampo(BaseModel):
    campo: str
    mensaje: str


class Problema(BaseModel):
    title: str
    status: int
    detail: str | None = None
    errores: list[ErrorCampo] | None = None


class Auditoria(BaseModel):
    """Columnas de auditoría (DEC-0008): las completa el servidor, el cliente no las envía."""

    created_by: uuid.UUID | None = Field(
        json_schema_extra={"readOnly": True},
        description="Usuario que creó el registro; vacío si lo hizo el proceso automático.",
    )
    updated_by: uuid.UUID | None = Field(
        json_schema_extra={"readOnly": True},
        description="Usuario que lo modificó por última vez; vacío si fue el proceso automático.",
    )
    created_at: datetime = Field(json_schema_extra={"readOnly": True})
    updated_at: datetime = Field(json_schema_extra={"readOnly": True})
