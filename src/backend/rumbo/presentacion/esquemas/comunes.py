"""Esquemas comunes del contrato: el error problem+json (RFC 9457) y su detalle por campo."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoComision = Literal["importe", "porcentaje"]  # el porcentaje es sobre la ganancia (DEC-0007)


class ErrorCampo(BaseModel):
    campo: str
    mensaje: str


class Problema(BaseModel):
    title: str
    status: int
    detail: str | None = None
    errores: list[ErrorCampo] | None = None


class Entrada(BaseModel):
    """Cuerpo de entrada: los textos se recortan, así que uno de solo espacios queda vacío."""

    model_config = ConfigDict(str_strip_whitespace=True)


def _sin_defecto_nulo(esquema: dict[str, Any]) -> None:
    """Un campo obligatorio de la base no publica `default: null`: se puede omitir, no vaciar."""
    for propiedad in esquema.get("properties", {}).values():
        if propiedad.get("default", ...) is None and "anyOf" not in propiedad:
            del propiedad["default"]


def omitible(**restricciones: Any) -> Any:
    """Campo de un `PATCH` que en la base es obligatorio: se puede omitir, no vaciar."""
    return Field(default=None, **restricciones)


class Edicion(Entrada):
    """Cuerpo de un `PATCH`: lo no enviado no cambia. Los campos obligatorios se declaran con
    `omitible()` y su tipo sin `None`: omitirlos vale, un `null` explícito da 422. Solo los
    anulables llevan `| None`. El servicio lee `model_dump(exclude_unset=True)`."""

    model_config = ConfigDict(json_schema_extra=_sin_defecto_nulo)


class Auditoria(BaseModel):
    """Columnas de auditoría de toda salida (DEC-0008); las completa el servidor."""

    created_by: uuid.UUID | None = Field(json_schema_extra={"readOnly": True})
    updated_by: uuid.UUID | None = Field(json_schema_extra={"readOnly": True})
    created_at: datetime = Field(json_schema_extra={"readOnly": True})
    updated_at: datetime = Field(json_schema_extra={"readOnly": True})
