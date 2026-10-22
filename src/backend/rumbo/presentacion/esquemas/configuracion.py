"""Esquemas de parámetros, destinos, requisitos de destino y operadores (CU-06, CU-07, CU-13,
CU-15, CU-26, CU-30, CU-31, DEC-0013)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from rumbo.presentacion.esquemas.comunes import TipoComision

TipoRequisito = Literal["visa", "vacunacion", "documentacion", "seguro", "formulario", "otro"]


class ConfiguracionEditar(BaseModel):
    """Parámetros del negocio: reemplazan a los vigentes (`PUT`)."""

    vigencia_cotizacion_meses: int = Field(ge=1)
    anticipacion_salida_dias: int = Field(ge=0)
    recontacto_meses: int = Field(ge=1)


class Configuracion(ConfiguracionEditar):
    updated_at: datetime


class ComisionPorDefecto(BaseModel):
    """Comisión por defecto de un vendedor; ambos en `null` la quita. No recalcula los viajes
    ya registrados (DEC-0013)."""

    comision_default_tipo: TipoComision | None
    comision_default_valor: Decimal | None = Field(ge=0)


class Destino(BaseModel):
    id: uuid.UUID
    nombre: str
    pais: str
    region: str | None
    notas: str | None
    activo: bool
    created_at: datetime
    updated_at: datetime


class DestinoCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    pais: str = Field(min_length=1, max_length=80)
    region: str | None = Field(default=None, max_length=80)
    notas: str | None = None


class DestinoEditar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    pais: str | None = Field(default=None, min_length=1, max_length=80)
    region: str | None = Field(default=None, max_length=80)
    notas: str | None = None


class RequisitoDestino(BaseModel):
    id: uuid.UUID
    destino_id: uuid.UUID
    nombre: str
    tipo: TipoRequisito
    obligatorio: bool  # obligatorio o recomendado
    descripcion: str | None
    anticipacion_dias: int
    activo: bool
    created_at: datetime
    updated_at: datetime


class RequisitoDestinoCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    tipo: TipoRequisito
    obligatorio: bool
    descripcion: str | None = None
    anticipacion_dias: int = Field(ge=0)


class RequisitoDestinoEditar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    tipo: TipoRequisito | None = None
    obligatorio: bool | None = None
    descripcion: str | None = None
    anticipacion_dias: int | None = Field(default=None, ge=0)


class Operador(BaseModel):
    id: uuid.UUID
    nombre: str
    contacto: str | None
    activo: bool
    created_at: datetime
    updated_at: datetime


class OperadorCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    contacto: str | None = Field(default=None, max_length=200)


class OperadorEditar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    contacto: str | None = Field(default=None, max_length=200)
