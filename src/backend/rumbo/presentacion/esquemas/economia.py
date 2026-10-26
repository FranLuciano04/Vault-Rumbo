"""Esquemas del módulo economía: control económico, plan de pagos y cobros (CU-10, CU-11, CU-12,
DEC-0007, DEC-0013)."""

import uuid
from datetime import date
from typing import Self

from pydantic import ConfigDict, Field, model_validator
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import EstadoPago, FormaPago, Moneda, TipoPago
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    Entrada,
    Importe,
    TipoCambio,
    TipoComision,
    componer_con_auditoria,
)

_SOLO_LECTURA: JsonDict = {"readOnly": True}


class EconomiaViaje(Entrada):
    """Control económico del viaje (CU-10). Los importes van en la moneda del viaje."""

    precio_venta: Importe
    costo: Importe = Field(description="Costo del operador.")
    operador_id: uuid.UUID | None = None
    vendedor_id: uuid.UUID | None = None
    comision_tipo: TipoComision | None = None
    comision_vendedor: Importe | None = Field(
        default=None,
        description="Si se omite, se toma el valor por defecto del vendedor (CU-13).",
    )

    @model_validator(mode="after")
    def _porcentaje_hasta_cien(self) -> Self:
        """Misma regla que la comisión por defecto del vendedor (CU-13, DEC-0007)."""
        if (
            self.comision_tipo == "porcentaje"
            and self.comision_vendedor is not None
            and self.comision_vendedor > 100
        ):
            raise ValueError("Un porcentaje de comisión no puede superar 100.")
        return self


class PagoPlanItem(Entrada):
    monto: Importe = Field(description="En la moneda del viaje.")
    tipo: TipoPago
    vencimiento: date


class PlanDePagos(Entrada):
    """La suma de los montos tiene que ser igual al precio de venta del viaje (CU-11)."""

    pagos: list[PagoPlanItem] = Field(min_length=1)


class Pago(Auditoria):
    """Cuota del plan de pagos de un viaje; el checklist de cobros de CU-12."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    viaje_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    monto: Importe = Field(description="Planificado, en la moneda del viaje.")
    tipo: TipoPago
    vencimiento: date
    estado: EstadoPago = Field(json_schema_extra=_SOLO_LECTURA)
    forma_pago: FormaPago | None = Field(json_schema_extra=_SOLO_LECTURA)
    moneda_pago: Moneda | None = Field(json_schema_extra=_SOLO_LECTURA)
    tipo_cambio: TipoCambio | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Si la moneda del cobro difiere de la del viaje.",
    )
    monto_cobrado: Importe | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Importe real recibido, en moneda_pago."
    )
    fecha_cobro: date | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Fecha efectiva del cobro."
    )

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class PagoReprogramar(Entrada):
    vencimiento: date


class PagoDividir(Entrada):
    monto_ahora: Importe = Field(
        description="Parte que se va a cobrar ahora; el resto queda en un pago nuevo."
    )
    vencimiento_resto: date = Field(description="Vencimiento del pago con el resto.")


class CobroRegistrar(Entrada):
    """El servidor calcula monto_cobrado y actualiza el estado del viaje (CU-12 A0 y A2)."""

    fecha_cobro: date
    forma_pago: FormaPago
    moneda_pago: Moneda
    tipo_cambio: TipoCambio | None = Field(
        default=None, description="Obligatorio si moneda_pago difiere de la moneda del viaje."
    )
