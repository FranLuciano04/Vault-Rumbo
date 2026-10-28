"""Esquemas del módulo oportunidades: consulta, seguimiento, cotizaciones y sus versiones (CU-04,
CU-05, CU-06, DEC-0006, DEC-0007, DEC-0013)."""

import uuid
from datetime import date
from typing import Self

from pydantic import ConfigDict, Field, model_validator
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import (
    CanalOportunidad,
    EstadoCotizacion,
    EstadoOportunidad,
    Moneda,
    MotivoPerdida,
)
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    Edicion,
    Entrada,
    Importe,
    componer_con_auditoria,
    omitible,
)

_SOLO_LECTURA: JsonDict = {"readOnly": True}


def _fechas_en_orden(desde: date | None, hasta: date | None) -> None:
    if desde is not None and hasta is not None and hasta < desde:
        raise ValueError("La fecha hasta no puede ser anterior a la fecha desde.")


class Oportunidad(Auditoria):
    """Consulta de un cliente que avanza por el embudo (CU-05)."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    cliente_id: uuid.UUID
    cliente_nombre: str = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Nombre del cliente, para mostrarlo sin otra consulta.",
    )
    responsable_id: uuid.UUID = Field(
        description="Quien la registró o la sigue; define la vista personal (DEC-0005)."
    )
    canal: CanalOportunidad
    destino_consultado: str | None = Field(
        description="Texto libre; se normaliza a un Destino al confirmar la reserva (DEC-0006). "
        "Puede faltar al registrar la consulta; hace falta para cotizar (DEC-0023)."
    )
    fecha_desde_tentativa: date | None
    fecha_hasta_tentativa: date | None
    pasajeros: int | None = Field(
        ge=1,
        description="Puede faltar al registrar la consulta; hace falta para cotizar (DEC-0023).",
    )
    estado: EstadoOportunidad = Field(json_schema_extra=_SOLO_LECTURA)
    motivo_perdida: MotivoPerdida | None = Field(json_schema_extra=_SOLO_LECTURA)
    motivo_perdida_detalle: str | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Texto libre si el motivo es «otro»."
    )
    notas: str | None = Field(description="Notas de la consulta y del seguimiento.")

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class OportunidadCrear(Entrada):
    """Registra una consulta (CU-04). El responsable es el usuario que la registra."""

    cliente_id: uuid.UUID
    canal: CanalOportunidad
    destino_consultado: str | None = Field(default=None, min_length=1, max_length=200)
    fecha_desde_tentativa: date | None = None
    fecha_hasta_tentativa: date | None = None
    pasajeros: int | None = Field(default=None, ge=1)
    notas: str | None = None

    @model_validator(mode="after")
    def _fechas_tentativas_en_orden(self) -> Self:
        _fechas_en_orden(self.fecha_desde_tentativa, self.fecha_hasta_tentativa)
        return self


class OportunidadEditar(Edicion):
    """Solo se envían los campos que cambian."""

    canal: CanalOportunidad = omitible()
    # Anulable en la base, pero una vez cargado no se vacía: hace falta para cotizar (DEC-0023).
    destino_consultado: str = omitible(min_length=1, max_length=200)
    fecha_desde_tentativa: date | None = None
    fecha_hasta_tentativa: date | None = None
    # Anulable en la base, pero una vez cargado no se vacía: hace falta para cotizar (DEC-0023).
    pasajeros: int = omitible(ge=1)
    notas: str | None = None
    responsable_id: uuid.UUID = omitible(
        description="Reasignar el responsable: solo admin o dueño."
    )

    @model_validator(mode="after")
    def _fechas_tentativas_en_orden(self) -> Self:
        _fechas_en_orden(self.fecha_desde_tentativa, self.fecha_hasta_tentativa)
        return self


class OportunidadPerder(Entrada):
    motivo_perdida: MotivoPerdida
    motivo_perdida_detalle: str | None = Field(
        default=None, description="Obligatorio si el motivo es «otro»."
    )

    @model_validator(mode="after")
    def _otro_lleva_detalle(self) -> Self:
        if self.motivo_perdida is MotivoPerdida.otro and not self.motivo_perdida_detalle:
            raise ValueError("El motivo «otro» requiere un detalle.")
        return self


class Insistencia(Entrada):
    """Agenda un recontacto: crea una alerta para el responsable (CU-05)."""

    fecha: date = Field(description="Cuándo volver a contactar.")
    descripcion: str = Field(min_length=1)


class ItemCotizacion(Entrada):
    concepto: str = Field(min_length=1, description="Aéreo, alojamiento, traslados, excursiones…")
    precio: Importe


class Cotizacion(Auditoria):
    """Versión de la cotización de una oportunidad; el precio va en la moneda indicada (CU-06)."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    oportunidad_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    fecha: date = Field(json_schema_extra=_SOLO_LECTURA, description="Fecha de emisión.")
    moneda: Moneda
    items: list[ItemCotizacion] = Field(min_length=1)
    total: Importe = Field(
        json_schema_extra=_SOLO_LECTURA, description="Suma de los ítems; la calcula el servidor."
    )
    validez_hasta: date = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Fecha de emisión más la vigencia configurada (1 mes por defecto).",
    )
    estado: EstadoCotizacion = Field(json_schema_extra=_SOLO_LECTURA)

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class CotizacionCrear(Entrada):
    """Cada envío crea una versión nueva; las anteriores quedan en el historial (CU-06 A1)."""

    moneda: Moneda
    items: list[ItemCotizacion] = Field(min_length=1)
