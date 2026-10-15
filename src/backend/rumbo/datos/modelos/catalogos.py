"""Usuarios, parámetros del negocio y catálogos: Usuario, Configuracion, Destino,
RequisitoDestino, Operador y Hotel."""

import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from rumbo.datos.modelos.base import AuditoriaMixin, Base, IdMixin
from rumbo.datos.modelos.enums import EstadoHotel, RolUsuario, TipoComision, TipoRequisito


class Usuario(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint("comision_default_valor >= 0"),
        CheckConstraint(
            "(comision_default_tipo IS NULL) = (comision_default_valor IS NULL)"
            " AND (comision_default_tipo IS DISTINCT FROM 'porcentaje'"
            " OR comision_default_valor <= 100)",
            name="usuario_comision_default_ck",
        ),
    )

    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True)  # DEC-0016
    rol: Mapped[RolUsuario]
    activo: Mapped[bool] = mapped_column(server_default=text("true"))  # baja lógica (DEC-0013)
    acceso_redes: Mapped[bool] = mapped_column(server_default=text("false"))
    comision_default_tipo: Mapped[TipoComision | None]
    comision_default_valor: Mapped[Decimal | None]


class Configuracion(AuditoriaMixin, Base):
    """Parámetros del negocio que edita admin (DEC-0013): una sola fila."""

    __tablename__ = "configuracion"
    __table_args__ = (
        CheckConstraint("id = 1"),
        CheckConstraint("vigencia_cotizacion_meses >= 1"),
        CheckConstraint("anticipacion_salida_dias >= 0"),
        CheckConstraint("recontacto_meses >= 1"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, default=1, server_default=text("1"))
    vigencia_cotizacion_meses: Mapped[int] = mapped_column(server_default=text("1"))
    anticipacion_salida_dias: Mapped[int] = mapped_column(server_default=text("7"))
    recontacto_meses: Mapped[int] = mapped_column(server_default=text("6"))


class Destino(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "destino"

    nombre: Mapped[str] = mapped_column(String(120))
    pais: Mapped[str] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(80))
    activo: Mapped[bool] = mapped_column(server_default=text("true"))
    notas: Mapped[str | None] = mapped_column(Text)


class RequisitoDestino(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "requisito_destino"
    __table_args__ = (CheckConstraint("anticipacion_dias >= 0"),)

    destino_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("destino.id"))
    nombre: Mapped[str] = mapped_column(String(120))
    tipo: Mapped[TipoRequisito]
    obligatorio: Mapped[bool]  # obligatorio o recomendado
    descripcion: Mapped[str | None] = mapped_column(Text)
    anticipacion_dias: Mapped[int]
    activo: Mapped[bool] = mapped_column(server_default=text("true"))


class Operador(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "operador"

    nombre: Mapped[str] = mapped_column(String(120))
    contacto: Mapped[str | None] = mapped_column(String(200))
    activo: Mapped[bool] = mapped_column(server_default=text("true"))  # baja lógica, DEC-0009


class Hotel(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "hotel"
    __table_args__ = (CheckConstraint("precio_referencia >= 0"),)

    destino_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("destino.id"))
    nombre: Mapped[str] = mapped_column(String(120))
    categoria: Mapped[str] = mapped_column(String(40))  # estrellas o tipo
    precio_referencia: Mapped[Decimal]  # por noche
    servicios: Mapped[str] = mapped_column(Text)  # amenities filtrables
    estado: Mapped[EstadoHotel] = mapped_column(server_default=text("'activo'"))
