"""Esquemas del módulo viajes: reserva, ficha, estados, cancelación e itinerario (CU-07 a CU-10,
CU-27, DEC-0007, DEC-0013)."""

import enum
import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.json_schema import JsonDict

from rumbo.datos import modelos
from rumbo.datos.modelos import CategoriaViaje, EstadoViaje, Moneda
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    DecimalConSigno,
    Entrada,
    Fraccion,
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
        description="Estado en que estaba antes de cancelarse: al que vuelve revertir-cancelacion. "
        "Vacío si no está cancelado.",
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
    porcentaje_pagado: Fraccion = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Porción del precio de venta ya cobrada. Lo calcula la API (CU-12).",
    )

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)

    @field_validator("comision_tipo", mode="before")
    @classmethod
    def _valor_del_enum(cls, valor: object) -> object:
        """El modelo guarda el enum de la base; el contrato publica su valor en texto."""
        return valor.value if isinstance(valor, enum.Enum) else valor


AdvertenciaEconomia = Literal["ganancia_negativa", "margen_negativo", "plan_desbalanceado"]


class EconomiaRegistrada(Viaje):
    """El viaje con su economía guardada y lo que conviene revisar, que no impidió guardar
    (CU-10 A3 y A4)."""

    advertencias: list[AdvertenciaEconomia] = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Vacía si no hay nada que advertir. `plan_desbalanceado`: los pagos ya no "
        "suman el precio de venta y hay que rebalancearlos (CU-11).",
    )

    @classmethod
    def desde_modelo(
        cls,
        viaje: modelos.Viaje,
        saldo_pendiente: Decimal,
        porcentaje_pagado: Decimal,
        advertencias: list[str],
    ) -> "EconomiaRegistrada":
        """El viaje con su saldo, su porcentaje pagado y las advertencias, que no son columnas."""
        calculados = {"saldo_pendiente", "porcentaje_pagado", "advertencias"}
        return cls.model_validate(
            {n: getattr(viaje, n) for n in cls.model_fields if n not in calculados}
            | {
                "saldo_pendiente": saldo_pendiente,
                "porcentaje_pagado": porcentaje_pagado,
                "advertencias": advertencias,
            }
        )


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
