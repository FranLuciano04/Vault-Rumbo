"""Post-venta, alertas y redes: Resena, Alerta y ContenidoRed."""

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from rumbo.datos.modelos.base import AuditoriaMixin, Base, IdMixin
from rumbo.datos.modelos.enums import (
    CanalContenido,
    EstadoAlerta,
    EstadoKanban,
    EstadoResena,
    TipoAlerta,
)


class Resena(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "resena"
    __table_args__ = (
        CheckConstraint("puntaje BETWEEN 1 AND 5"),
        CheckConstraint(
            "(estado = 'oculta') = (motivo_baja IS NOT NULL)", name="resena_motivo_baja_ck"
        ),
    )

    cliente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cliente.id"))
    hotel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hotel.id"))
    viaje_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("viaje.id"))  # trazabilidad
    puntaje: Mapped[int]
    comentario: Mapped[str] = mapped_column(Text)
    fecha: Mapped[date]
    estado: Mapped[EstadoResena] = mapped_column(server_default=text("'publicada'"))
    motivo_baja: Mapped[str | None] = mapped_column(Text)  # motivo al ocultarla (DEC-0013)


class Alerta(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "alerta"
    __table_args__ = (
        CheckConstraint(
            "(estado = 'resuelta') = (resuelta_en IS NOT NULL)", name="alerta_resuelta_en_ck"
        ),
        # a lo sumo uno de los cinco orígenes; ninguno en una alerta manual suelta (CU-28)
        CheckConstraint(
            "num_nonnulls(viaje_id, pago_id, oportunidad_id, cliente_id, viaje_hotel_id) <= 1",
            name="alerta_un_origen_ck",
        ),
    )

    propietario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))  # agenda personal
    viaje_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("viaje.id"))
    pago_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pago.id"))
    oportunidad_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("oportunidad.id"))
    cliente_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cliente.id"))
    # quitar el tramo (CU-09 A3) no borra la alerta
    viaje_hotel_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("viaje_hotel.id", ondelete="SET NULL")
    )
    tipo: Mapped[TipoAlerta]
    descripcion: Mapped[str] = mapped_column(Text)  # qué hay que hacer (DEC-0013)
    fecha: Mapped[date]
    estado: Mapped[EstadoAlerta] = mapped_column(server_default=text("'pendiente'"))
    resuelta_en: Mapped[datetime | None]  # progreso del día (DEC-0013)
    cerrada_por_cancelacion: Mapped[bool] = mapped_column(server_default=text("false"))


class ContenidoRed(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "contenido_red"

    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))
    titulo: Mapped[str] = mapped_column(String(200))
    texto: Mapped[str | None] = mapped_column(Text)  # cuerpo del posteo (DEC-0013)
    canal: Mapped[CanalContenido]
    estado_kanban: Mapped[EstadoKanban] = mapped_column(server_default=text("'idea'"))
    fecha_publicacion: Mapped[date]  # programada
