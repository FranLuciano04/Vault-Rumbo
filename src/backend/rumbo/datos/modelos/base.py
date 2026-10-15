"""Base declarativa y mixin de auditoría (DEC-0008)."""

import enum
import re
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column

from rumbo.datos.modelos import enums


def _enum_pg(clase: type[enum.Enum]) -> Enum:
    """Tipo `ENUM` de PostgreSQL con los valores del enum y el nombre de la clase en snake_case."""
    nombre = re.sub(r"(?<!^)(?=[A-Z])", "_", clase.__name__).lower()
    return Enum(clase, name=nombre, values_callable=lambda e: [m.value for m in e])


_ENUMS = [
    clase
    for clase in vars(enums).values()
    if isinstance(clase, type) and issubclass(clase, enum.Enum)
]


class Base(DeclarativeBase):
    type_annotation_map = {
        **{clase: _enum_pg(clase) for clase in _ENUMS},
        Decimal: Numeric(14, 2),
        datetime: DateTime(timezone=True),
    }


class AuditoriaMixin:
    """`created_by`/`updated_by` vacíos = lo hizo el proceso automático."""

    @declared_attr
    @classmethod
    def created_by(cls) -> Mapped[uuid.UUID | None]:
        return mapped_column(ForeignKey("usuario.id"))

    @declared_attr
    @classmethod
    def updated_by(cls) -> Mapped[uuid.UUID | None]:
        return mapped_column(ForeignKey("usuario.id"))

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
