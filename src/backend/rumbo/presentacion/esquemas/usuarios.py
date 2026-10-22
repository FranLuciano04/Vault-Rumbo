"""Esquemas de usuarios (CU-25, RF-144, RF-147, RF-148, DEC-0013, DEC-0016)."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from rumbo.presentacion.esquemas.comunes import TipoComision
from rumbo.presentacion.esquemas.seguridad import Rol


class Usuario(BaseModel):
    id: uuid.UUID
    nombre: str
    email: str
    rol: Rol
    activo: bool
    acceso_redes: bool
    comision_default_tipo: TipoComision | None
    comision_default_valor: Decimal | None
    created_at: datetime
    updated_at: datetime


class UsuarioCrear(BaseModel):
    """Alta de usuario: la cuenta de Firebase y el mail para elegir contraseña los resuelve el
    servidor; el cuerpo no lleva contraseña (DEC-0016)."""

    nombre: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    rol: Rol
    acceso_redes: bool = False


class UsuarioEditar(BaseModel):
    """Cambio de rol o de acceso a redes; lo no enviado no cambia (CU-25 A2)."""

    rol: Rol | None = None
    acceso_redes: bool | None = None
