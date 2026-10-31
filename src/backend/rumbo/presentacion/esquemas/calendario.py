"""Esquemas del calendario de viajes, vencimientos y alertas (CU-23)."""

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import EstadoAlerta, EstadoPago, EstadoViaje

_SOLO_LECTURA: JsonDict = {"readOnly": True}


TipoEvento = Literal["viaje", "vencimiento", "alerta"]


class EventoCalendario(BaseModel):
    """Un viaje (de su salida a su regreso), el vencimiento de un pago o una alerta (un solo
    día). Solo lectura: el detalle se gestiona desde su viaje, su pago o su alerta."""

    tipo: TipoEvento = Field(json_schema_extra=_SOLO_LECTURA)
    titulo: str = Field(json_schema_extra=_SOLO_LECTURA, description="Qué mostrar en la grilla.")
    desde: date = Field(json_schema_extra=_SOLO_LECTURA)
    hasta: date = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Igual a `desde` en un vencimiento o una alerta.",
    )
    estado: EstadoViaje | EstadoPago | EstadoAlerta = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Del viaje, del pago o de la alerta, según el `tipo`.",
    )
    viaje_id: uuid.UUID | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Siempre en un viaje o un vencimiento; en una alerta, si nace de un viaje.",
    )
    pago_id: uuid.UUID | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Solo en un vencimiento."
    )
    alerta_id: uuid.UUID | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Solo en una alerta."
    )
    responsable_id: uuid.UUID = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="El del viaje o, en una alerta, su propietario.",
    )
