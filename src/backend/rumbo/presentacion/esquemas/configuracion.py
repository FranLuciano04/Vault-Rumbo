"""Esquemas de parámetros, destinos, requisitos de destino y operadores (CU-06, CU-07, CU-13,
CU-15, CU-26, CU-30, CU-31, DEC-0013)."""

import enum
import uuid
from decimal import Decimal
from typing import Literal, Self

from pydantic import ConfigDict, Field, field_validator, model_validator

from rumbo.presentacion.esquemas.comunes import Auditoria, Edicion, Entrada, TipoComision, omitible

TipoRequisito = Literal["visa", "vacunacion", "documentacion", "seguro", "formulario", "otro"]


class ConfiguracionEditar(Entrada):
    """Parámetros del negocio: reemplazan a los vigentes (`PUT`)."""

    vigencia_cotizacion_meses: int = Field(ge=1)
    anticipacion_salida_dias: int = Field(ge=0)
    recontacto_meses: int = Field(ge=1)


class Configuracion(ConfiguracionEditar, Auditoria):
    model_config = ConfigDict(from_attributes=True)


class ComisionPorDefecto(Entrada):
    """Comisión por defecto de un vendedor; ambos en `null` la quita. No recalcula los viajes
    ya registrados (DEC-0013)."""

    comision_default_tipo: TipoComision | None
    comision_default_valor: Decimal | None = Field(ge=0, max_digits=14, decimal_places=2)

    @model_validator(mode="after")
    def _tipo_y_valor_van_juntos(self) -> Self:
        """Misma regla que `usuario_comision_default_ck` (CU-13, DEC-0007)."""
        tipo, valor = self.comision_default_tipo, self.comision_default_valor
        if (tipo is None) != (valor is None):
            raise ValueError("El tipo y el valor de la comisión van juntos o ninguno.")
        if tipo == "porcentaje" and valor is not None and valor > 100:
            raise ValueError("Un porcentaje de comisión no puede superar 100.")
        return self


class Destino(Auditoria):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    pais: str
    region: str | None
    notas: str | None
    activo: bool


class DestinoCrear(Entrada):
    nombre: str = Field(min_length=1, max_length=120)
    pais: str = Field(min_length=1, max_length=80)
    region: str | None = Field(default=None, max_length=80)
    notas: str | None = None


class DestinoEditar(Edicion):
    nombre: str = omitible(min_length=1, max_length=120)
    pais: str = omitible(min_length=1, max_length=80)
    region: str | None = Field(default=None, max_length=80)
    notas: str | None = None


class RequisitoDestino(Auditoria):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    destino_id: uuid.UUID
    nombre: str
    tipo: TipoRequisito
    obligatorio: bool  # obligatorio o recomendado
    descripcion: str | None
    anticipacion_dias: int
    activo: bool

    @field_validator("tipo", mode="before")
    @classmethod
    def _valor_del_enum(cls, valor: object) -> object:
        """El modelo guarda el enum de la base; el contrato publica su valor en texto."""
        return valor.value if isinstance(valor, enum.Enum) else valor


class RequisitoDestinoCrear(Entrada):
    nombre: str = Field(min_length=1, max_length=120)
    tipo: TipoRequisito
    obligatorio: bool
    descripcion: str | None = None
    anticipacion_dias: int = Field(ge=0)


class RequisitoDestinoEditar(Edicion):
    nombre: str = omitible(min_length=1, max_length=120)
    tipo: TipoRequisito = omitible()
    obligatorio: bool = omitible()
    descripcion: str | None = None
    anticipacion_dias: int = omitible(ge=0)


class Operador(Auditoria):
    id: uuid.UUID
    nombre: str
    contacto: str | None
    activo: bool


class OperadorCrear(Entrada):
    nombre: str = Field(min_length=1, max_length=120)
    contacto: str | None = Field(default=None, max_length=200)


class OperadorEditar(Edicion):
    nombre: str = omitible(min_length=1, max_length=120)
    contacto: str | None = Field(default=None, max_length=200)
