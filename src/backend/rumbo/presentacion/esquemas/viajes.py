"""Esquemas del módulo viajes: reserva, ficha, estados, cancelación e itinerario (CU-07 a CU-10,
CU-27, DEC-0007, DEC-0013)."""

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import CategoriaViaje, EstadoViaje, Moneda
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    DecimalConSigno,
    Entrada,
    Importe,
    TipoComision,
    componer_con_auditoria,
)
from rumbo.presentacion.esquemas.economia import EconomiaViaje, PlanDePagos

_SOLO_LECTURA: JsonDict = {"readOnly": True}


class Viaje(Auditoria):
    """Ficha del viaje con su economía y su saldo. Los importes van en la moneda del viaje."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    cliente_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    oportunidad_id: uuid.UUID | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Oportunidad de origen."
    )
    destino_id: uuid.UUID
    operador_id: uuid.UUID | None
    responsable_id: uuid.UUID
    vendedor_id: uuid.UUID | None
    fecha_salida: date
    fecha_regreso: date
    categoria: CategoriaViaje
    estado: EstadoViaje = Field(json_schema_extra=_SOLO_LECTURA)
    estado_previo: EstadoViaje | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Estado al que vuelve corregir-estado, o revertir-cancelacion si cancelado.",
    )
    motivo_cancelacion: str | None = Field(json_schema_extra=_SOLO_LECTURA)
    fecha_cancelacion: date | None = Field(json_schema_extra=_SOLO_LECTURA)
    moneda: Moneda = Field(
        json_schema_extra=_SOLO_LECTURA, description="Se fija al confirmar la reserva (DEC-0013)."
    )
    precio_venta: Importe
    costo: Importe = Field(description="Costo del operador.")
    ganancia: DecimalConSigno = Field(
        json_schema_extra=_SOLO_LECTURA, description="precio_venta − costo."
    )
    margen: DecimalConSigno | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="ganancia / precio_venta, como fracción (0.25 = 25 %).",
    )
    comision_tipo: TipoComision
    comision_vendedor: Importe = Field(
        description="Importe, o porcentaje sobre la ganancia, según comision_tipo."
    )
    saldo_pendiente: Importe = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Suma de los pagos no cobrados, en la moneda del viaje. Lo calcula la API "
        "(CU-12).",
    )
    porcentaje_pagado: Importe = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Porción del precio de venta ya cobrada. Lo calcula la API (CU-12).",
    )

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class ConfirmarReserva(Entrada):
    """Crea en una sola transacción el viaje en estado reservado, su economía, el plan de pagos y
    las alertas de formularios, salida y vencimientos, y cierra la oportunidad como ganada
    (CU-07, CU-10, CU-11)."""

    destino_id: uuid.UUID = Field(description="Del catálogo de destinos.")
    fecha_salida: date
    fecha_regreso: date
    categoria: CategoriaViaje
    responsable_id: uuid.UUID | None = Field(
        default=None, description="Por defecto, el responsable de la oportunidad."
    )
    moneda: Moneda | None = Field(
        default=None,
        description="Se toma de la cotización aceptada; solo se envía en la venta directa "
        "(CU-07 A1).",
    )
    economia: EconomiaViaje
    plan_de_pagos: PlanDePagos


class Cancelacion(Entrada):
    motivo_cancelacion: str = Field(min_length=1)
    fecha_cancelacion: date


class Tramo(BaseModel):
    """Hotel del itinerario. Esquema preliminar: acepta cualquier objeto hasta que el ticket de
    backend de CU-09 fije sus campos."""

    model_config = ConfigDict(extra="allow")
