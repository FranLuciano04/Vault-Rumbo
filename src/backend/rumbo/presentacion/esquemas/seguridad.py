"""Esquemas del módulo seguridad (CU-24, RF-141)."""

import uuid
from typing import Literal

from pydantic import BaseModel

Rol = Literal["admin", "dueno", "empleado", "freelance"]


class UsuarioActual(BaseModel):
    """Usuario de Rumbo de la sesión, con su rol y accesos."""

    id: uuid.UUID
    nombre: str
    email: str
    rol: Rol
    acceso_redes: bool
