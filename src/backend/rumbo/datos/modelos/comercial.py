"""Circuito comercial: Cliente, Oportunidad, Cotizacion, Viaje, Pago y ViajeHotel."""

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Computed,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from rumbo.core.contacto import clave_contacto
from rumbo.datos.modelos.base import AuditoriaMixin, Base, IdMixin
from rumbo.datos.modelos.catalogos import Usuario
from rumbo.datos.modelos.enums import (
    CanalOportunidad,
    CategoriaViaje,
    EstadoCotizacion,
    EstadoOportunidad,
    EstadoPago,
    EstadoViaje,
    FormaPago,
    Moneda,
    MotivoPerdida,
    SegmentoCliente,
    TipoComision,
    TipoPago,
)


class Cliente(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "cliente"

    asesor_asignado_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuario.id"))
    nombre: Mapped[str] = mapped_column(String(120))
    contacto: Mapped[str] = mapped_column(String(200))  # teléfono/WhatsApp o email (DEC-0017)
    # Clave canónica de `contacto` (la fija `_fijar_contacto_clave`): con ella se buscan duplicados.
    contacto_clave: Mapped[str] = mapped_column(String(200), index=True)
    instagram: Mapped[str | None] = mapped_column(String(30))  # usuario normalizado (DEC-0017)
    segmento: Mapped[SegmentoCliente]
    etiquetas: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(ARRAY(Text)), server_default=text("'{}'")
    )
    preferencias: Mapped[str | None] = mapped_column(Text)
    no_recontactar: Mapped[bool] = mapped_column(server_default=text("false"))  # opt-out del CRM
    # Cargado con el cliente en la misma consulta (join): la ficha y el listado muestran su nombre,
    # también si el asesor está de baja. Tras cambiar `asesor_asignado_id` hay que releerlo.
    asesor: Mapped[Usuario | None] = relationship(lazy="joined", foreign_keys=[asesor_asignado_id])

    @validates("contacto")
    def _fijar_contacto_clave(self, _campo: str, contacto: str) -> str:
        self.contacto_clave = clave_contacto(contacto)
        return contacto


class Oportunidad(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "oportunidad"
    __table_args__ = (
        CheckConstraint("pasajeros >= 1"),
        CheckConstraint("fecha_hasta_tentativa >= fecha_desde_tentativa"),
        CheckConstraint(
            "(estado = 'perdida') = (motivo_perdida IS NOT NULL)",
            name="oportunidad_motivo_perdida_ck",
        ),
    )

    cliente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cliente.id"))
    responsable_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))
    canal: Mapped[CanalOportunidad]
    destino_consultado: Mapped[str] = mapped_column(String(200))  # texto libre (DEC-0006)
    fecha_desde_tentativa: Mapped[date | None]
    fecha_hasta_tentativa: Mapped[date | None]
    pasajeros: Mapped[int]
    estado: Mapped[EstadoOportunidad] = mapped_column(server_default=text("'nueva'"))
    motivo_perdida: Mapped[MotivoPerdida | None]  # obligatorio al cerrar perdida (DEC-0013)
    motivo_perdida_detalle: Mapped[str | None] = mapped_column(Text)
    notas: Mapped[str | None] = mapped_column(Text)


class Cotizacion(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "cotizacion"
    __table_args__ = (CheckConstraint("total >= 0"), CheckConstraint("validez_hasta >= fecha"))

    oportunidad_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("oportunidad.id"))
    fecha: Mapped[date]
    moneda: Mapped[Moneda]
    items: Mapped[Any] = mapped_column(MutableList.as_mutable(JSONB))  # conceptos y precios
    total: Mapped[Decimal]
    validez_hasta: Mapped[date]  # default fecha + 1 mes, configurable (lo calcula la API)
    estado: Mapped[EstadoCotizacion] = mapped_column(server_default=text("'borrador'"))


class Viaje(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "viaje"
    __table_args__ = (
        CheckConstraint("precio_venta >= 0"),
        CheckConstraint("costo >= 0"),
        CheckConstraint("comision_vendedor >= 0"),
        CheckConstraint("fecha_regreso >= fecha_salida"),
        CheckConstraint(
            "comision_tipo <> 'porcentaje' OR comision_vendedor <= 100",
            name="viaje_comision_porcentaje_ck",
        ),
        # estado previo, motivo y fecha de cancelación: cargados solo mientras está cancelado
        CheckConstraint(
            "num_nonnulls(estado_previo, motivo_cancelacion, fecha_cancelacion)"
            " = CASE WHEN estado = 'cancelado' THEN 3 ELSE 0 END"
            " AND estado_previo IS DISTINCT FROM 'cancelado'",
            name="viaje_estado_previo_ck",
        ),
    )

    cliente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cliente.id"))
    # origen: una oportunidad deriva en a lo sumo un viaje
    oportunidad_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("oportunidad.id"), unique=True
    )
    destino_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("destino.id"))
    operador_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("operador.id"))
    responsable_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))
    vendedor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuario.id"))
    fecha_salida: Mapped[date]
    fecha_regreso: Mapped[date]
    categoria: Mapped[CategoriaViaje]
    estado: Mapped[EstadoViaje] = mapped_column(server_default=text("'reservado'"))
    estado_previo: Mapped[EstadoViaje | None]  # para revertir la cancelación (DEC-0013)
    motivo_cancelacion: Mapped[str | None] = mapped_column(Text)
    fecha_cancelacion: Mapped[date | None]
    moneda: Mapped[Moneda]  # moneda de referencia del viaje (DEC-0007)
    precio_venta: Mapped[Decimal]
    costo: Mapped[Decimal]  # del operador
    ganancia: Mapped[Decimal | None] = mapped_column(
        Computed("precio_venta - costo", persisted=True)
    )
    margen: Mapped[Decimal | None] = mapped_column(
        Numeric(7, 4),
        Computed(
            "CASE WHEN precio_venta > 0 THEN (precio_venta - costo) / precio_venta END",
            persisted=True,
        ),
    )  # fracción sobre la venta (0,25 = 25 %)
    comision_tipo: Mapped[TipoComision]  # cómo se lee comision_vendedor (DEC-0013)
    comision_vendedor: Mapped[Decimal]  # importe, o % sobre la ganancia (DEC-0007)


class Pago(IdMixin, AuditoriaMixin, Base):
    __tablename__ = "pago"
    __table_args__ = (
        CheckConstraint("monto > 0"),
        CheckConstraint("tipo_cambio > 0"),
        CheckConstraint("monto_cobrado > 0"),
    )

    viaje_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("viaje.id"))
    monto: Mapped[Decimal]  # planificado, en viaje.moneda
    tipo: Mapped[TipoPago]
    vencimiento: Mapped[date]
    estado: Mapped[EstadoPago] = mapped_column(server_default=text("'pendiente'"))
    forma_pago: Mapped[FormaPago | None]  # se carga al cobrar
    moneda_pago: Mapped[Moneda | None]  # se carga al cobrar
    tipo_cambio: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))  # si difiere de la moneda
    monto_cobrado: Mapped[Decimal | None]  # real recibido
    fecha_cobro: Mapped[date | None]  # fecha efectiva del cobro (DEC-0013)


class ViajeHotel(IdMixin, Base):
    """Tramo de hotel de un viaje (DEC-0003). Sin auditoría propia: hereda la de `Viaje`."""

    __tablename__ = "viaje_hotel"
    __table_args__ = (
        UniqueConstraint("viaje_id", "orden", name="viaje_hotel_orden_uk"),
        CheckConstraint("orden >= 1"),
        CheckConstraint("check_out >= check_in"),
        Index("viaje_hotel_viaje_hotel_ix", "viaje_id", "hotel_id"),
    )

    viaje_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("viaje.id"))
    hotel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hotel.id"))
    check_in: Mapped[date]
    check_out: Mapped[date]
    orden: Mapped[int]
    vencimiento_pago_proveedor: Mapped[date | None]
    pago_proveedor_realizado: Mapped[bool] = mapped_column(server_default=text("false"))
