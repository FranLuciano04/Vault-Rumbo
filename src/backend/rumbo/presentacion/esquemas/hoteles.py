"""Esquemas del módulo hoteles: catálogo de hoteles y reseñas (CU-16, CU-17, CU-18, CU-29,
RF-105, DEC-0003)."""

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.json_schema import JsonDict

from rumbo.datos import modelos
from rumbo.datos.modelos import EstadoHotel, EstadoResena
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    Edicion,
    Entrada,
    Importe,
    Problema,
    PuntajePromedio,
    componer_con_auditoria,
    omitible,
)

_SOLO_LECTURA: JsonDict = {"readOnly": True}
Puntaje = Field(ge=1, le=5, description="Entero de 1 a 5.")


class Hotel(Auditoria):
    """Hotel del catálogo compartido. Nunca se elimina: al cerrar pasa a `cerrado` (CU-16 A4)."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    nombre: str
    destino_id: uuid.UUID
    categoria: str | None = Field(description="Estrellas o tipo, por ejemplo `5 estrellas`.")
    precio_referencia: Importe | None = Field(description="Por noche, en ARS (DEC-0007).")
    servicios: list[str] = Field(description="Amenities filtrables: wifi, pileta, desayuno…")
    estado: EstadoHotel = Field(json_schema_extra=_SOLO_LECTURA)
    puntaje_promedio: PuntajePromedio | None = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Promedio de 1 a 5 de las reseñas publicadas, con dos decimales; vacío si "
        "no tiene. Lo calcula la API (CU-18), no se guarda.",
    )
    cantidad_resenas: int = Field(
        ge=0,
        json_schema_extra=_SOLO_LECTURA,
        description="Cantidad de reseñas publicadas que alimentan el promedio.",
    )

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)

    @classmethod
    def desde_modelo(
        cls, hotel: modelos.Hotel, puntaje_promedio: Decimal | None, cantidad_resenas: int
    ) -> "Hotel":
        """El hotel con su resumen de reseñas, que no es una columna."""
        calculados = {"puntaje_promedio", "cantidad_resenas"}
        return cls(
            **{n: getattr(hotel, n) for n in cls.model_fields if n not in calculados},
            puntaje_promedio=puntaje_promedio,
            cantidad_resenas=cantidad_resenas,
        )


class HotelCrear(Entrada):
    """Alta en el catálogo (CU-16). Un nombre repetido en el mismo destino responde `409`."""

    nombre: str = Field(min_length=1, max_length=120)
    destino_id: uuid.UUID
    categoria: str | None = Field(default=None, max_length=40)
    precio_referencia: Importe | None = None
    servicios: list[str] = Field(default_factory=list)


class HotelEditar(Edicion):
    nombre: str = omitible(min_length=1, max_length=120)
    destino_id: uuid.UUID = omitible()
    categoria: str | None = Field(default=None, max_length=40)
    precio_referencia: Importe | None = None
    servicios: list[str] = omitible()


class Resena(Auditoria):
    """Opinión de un cliente sobre un hotel. Nace `publicada`; moderarla la deja `oculta`."""

    id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    hotel_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    cliente_id: uuid.UUID = Field(json_schema_extra=_SOLO_LECTURA)
    viaje_id: uuid.UUID | None = Field(
        default=None, json_schema_extra=_SOLO_LECTURA, description="Viaje de origen, si se indicó."
    )
    puntaje: int = Puntaje
    comentario: str
    fecha: date
    estado: EstadoResena = Field(json_schema_extra=_SOLO_LECTURA)
    motivo_baja: str | None = Field(
        json_schema_extra=_SOLO_LECTURA, description="Motivo de la moderación; vacío si publicada."
    )

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class ResenaCrear(Entrada):
    """Reseña de un cliente sobre el hotel de la ruta (CU-17)."""

    cliente_id: uuid.UUID
    viaje_id: uuid.UUID | None = Field(default=None, description="Viaje de origen (opcional).")
    puntaje: int = Puntaje
    comentario: str = Field(default_factory=str)
    fecha: date


class ResenaEditar(Edicion):
    """Corrige la reseña (RF-105): el hotel, el cliente y el viaje no cambian."""

    puntaje: int = omitible(ge=1, le=5, description="Entero de 1 a 5.")
    comentario: str = omitible()
    fecha: date = omitible()


class ResenaOcultar(Entrada):
    motivo_baja: str = Field(min_length=1, description="Por qué se oculta (CU-29).")


class HotelExistente(BaseModel):
    id: uuid.UUID
    nombre: str


class ProblemaHotelDuplicado(Problema):
    """409 del alta o de la edición (CU-16 A2): trae el hotel que ya existe, para abrirlo."""

    existente: HotelExistente
