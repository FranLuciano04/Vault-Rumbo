"""Esquemas de usuarios (CU-25, RF-144, RF-147, RF-148, DEC-0013, DEC-0016)."""

import uuid
from decimal import Decimal

from pydantic import Field

from rumbo.presentacion.esquemas.comunes import Auditoria, Edicion, Entrada, TipoComision, omitible
from rumbo.presentacion.esquemas.seguridad import Rol

# Formato mínimo de email: algo@dominio.tld, sin espacios. La validación fina es la de Firebase.
PATRON_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class Usuario(Auditoria):
    id: uuid.UUID
    nombre: str
    email: str
    rol: Rol
    activo: bool
    acceso_redes: bool
    comision_default_tipo: TipoComision | None
    comision_default_valor: Decimal | None


class UsuarioCrear(Entrada):
    """Alta de usuario: la cuenta de Firebase y el mail para elegir contraseña los resuelve el
    servidor; el cuerpo no lleva contraseña (DEC-0016)."""

    nombre: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=254, pattern=PATRON_EMAIL, json_schema_extra={"format": "email"})
    rol: Rol
    acceso_redes: bool = False


class UsuarioEditar(Edicion):
    """Cambio de rol o de acceso a redes (CU-25 A2)."""

    rol: Rol = omitible()
    acceso_redes: bool = omitible()
