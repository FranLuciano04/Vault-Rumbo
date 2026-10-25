"""Esquemas del módulo alertas (CU-14, CU-28, CU-30)."""

import uuid
from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import EstadoAlerta, TipoAlerta
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    Edicion,
    Entrada,
    componer_con_auditoria,
    omitible,
)

_SOLO_LECTURA: JsonDict = {"readOnly": True}
Descripcion = Field(min_length=1)


class Alerta(Auditoria):
    """Aviso de la agenda de un usuario. A lo sumo uno de los cinco orígenes tiene valor;
    ninguno en un recordatorio manual suelto."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    propietario_id: uuid.UUID = Field(
        json_schema_extra=_SOLO_LECTURA, description="Dueño de la agenda donde aparece."
    )
    viaje_id: uuid.UUID | None = Field(json_schema_extra=_SOLO_LECTURA, description="Origen.")
    pago_id: uuid.UUID | None = Field(json_schema_extra=_SOLO_LECTURA, description="Origen.")
    oportunidad_id: uuid.UUID | None = Field(json_schema_extra=_SOLO_LECTURA, description="Origen.")
    cliente_id: uuid.UUID | None = Field(json_schema_extra=_SOLO_LECTURA, description="Origen.")
    viaje_hotel_id: uuid.UUID | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Origen: tramo del itinerario (pago al proveedor).",
    )
    tipo: TipoAlerta = Field(json_schema_extra=_SOLO_LECTURA)
    descripcion: str
    fecha: date = Field(description="Cuándo dispara.")
    estado: EstadoAlerta = Field(json_schema_extra=_SOLO_LECTURA)
    resuelta_en: datetime | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Cuándo se resolvió; vacío si no está resuelta.",
    )
    cerrada_por_cancelacion: bool = Field(json_schema_extra=_SOLO_LECTURA)

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class AlertaCrear(Entrada):
    """Recordatorio manual (CU-28). Como máximo se asocia a una entidad."""

    fecha: date
    descripcion: str = Descripcion
    viaje_id: uuid.UUID | None = None
    cliente_id: uuid.UUID | None = None
    oportunidad_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _una_sola_entidad(self) -> Self:
        asociadas = [self.viaje_id, self.cliente_id, self.oportunidad_id]
        if sum(entidad is not None for entidad in asociadas) > 1:
            raise ValueError("Asociá el recordatorio a una sola entidad.")
        return self


class AlertaEditar(Edicion):
    """Solo mientras está pendiente (CU-28 A2)."""

    fecha: date = omitible()
    descripcion: str = omitible(min_length=1)


class AlertaPosponer(Entrada):
    fecha: date = Field(description="Nueva fecha, posterior a la actual.")


class ProgresoDelDia(BaseModel):
    """Avance de la agenda de hoy del usuario actual (CU-14)."""

    resueltas_hoy: int = Field(ge=0)
    total_del_dia: int = Field(ge=0, description="Las resueltas hoy más las que quedan para hoy.")
