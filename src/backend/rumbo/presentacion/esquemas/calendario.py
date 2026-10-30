"""Esquemas del calendario de viajes y vencimientos (CU-23)."""

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import EstadoPago, EstadoViaje

_SOLO_LECTURA: JsonDict = {"readOnly": True}


TipoEvento = Literal["viaje", "vencimiento"]


class EventoCalendario(BaseModel):
    """Un viaje (de su salida a su regreso) o el vencimiento de un pago (un solo día). Solo
    lectura: el detalle se gestiona desde su viaje o su pago."""

    tipo: TipoEvento = Field(json_schema_extra=_SOLO_LECTURA)
    titulo: str = Field(json_schema_extra=_SOLO_LECTURA, description="Qué mostrar en la grilla.")
    desde: date = Field(json_schema_extra=_SOLO_LECTURA)
    hasta: date = Field(
        json_schema_extra=_SOLO_LECTURA, description="Igual a `desde` en un vencimiento."
    )
    estado: EstadoViaje | EstadoPago = Field(
        json_schema_extra=_SOLO_LECTURA, description="Del viaje o del pago, según el `tipo`."
    )
    viaje_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    pago_id: uuid.UUID | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Solo en un vencimiento."
    )
    responsable_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
