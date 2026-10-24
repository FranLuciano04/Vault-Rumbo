"""Esquemas del módulo clientes (CU-02, CU-03, RF-031)."""

import uuid
from datetime import date
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

from rumbo.datos.modelos import EstadoOportunidad, EstadoResena, EstadoViaje, SegmentoCliente
from rumbo.presentacion.esquemas.comunes import Auditoria, Edicion, Entrada, Problema, omitible

Nombre = Annotated[str, Field(min_length=1, max_length=120)]
Contacto = Annotated[str, Field(min_length=1, max_length=200)]
# Topes de las etiquetas: los usan el alta, la edición y el filtro de `GET /clientes`.
MAX_ETIQUETAS = 20
MAX_LARGO_ETIQUETA = 80
Etiqueta = Annotated[str, Field(max_length=MAX_LARGO_ETIQUETA)]
Etiquetas = Annotated[list[Etiqueta], Field(max_length=MAX_ETIQUETAS)]


# Solo espacios ASCII, el mismo conjunto que quita el esquema zod del alta.
_ESPACIOS = " \t\n\r\f\v"


def _normalizar_instagram(valor: Any) -> Any:
    """Quita espacios y un `@` inicial y pasa a minúsculas; lo que queda vacío es `None`."""
    if not isinstance(valor, str):
        return valor
    return valor.strip(_ESPACIOS).removeprefix("@").lower() or None


# Usuario de Instagram (DEC-0017): dato extra opcional, no cuenta como contacto mínimo.
Instagram = Annotated[
    Annotated[str, Field(pattern=r"^[a-z0-9._]{1,30}$")] | None,
    BeforeValidator(_normalizar_instagram),
]


class AsesorDelCliente(BaseModel):
    id: uuid.UUID
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class UltimoViajeDelCliente(BaseModel):
    """Viaje no cancelado de salida más reciente entre los que ya salieron (hasta hoy)."""

    fecha_salida: date
    destino: str = Field(description="Nombre del `Destino`.")

    model_config = ConfigDict(from_attributes=True)


class Cliente(Auditoria):
    """Ficha del cliente: contacto, segmento, etiquetas y preferencias."""

    id: uuid.UUID
    nombre: Nombre
    contacto: Contacto
    instagram: Instagram
    segmento: SegmentoCliente
    etiquetas: list[str]
    preferencias: str | None
    no_recontactar: bool
    asesor_asignado_id: uuid.UUID | None

    model_config = ConfigDict(from_attributes=True)


class ClienteListado(Cliente):
    """Fila del listado (CU-03 paso 1): la ficha más su resumen."""

    asesor: AsesorDelCliente | None
    ultimo_viaje: UltimoViajeDelCliente | None
    oportunidades_abiertas: int = Field(description="En `nueva`, `en_gestion` o `cotizada`.")


class ClienteCrear(Entrada):
    """Alta de un cliente (CU-02). `confirmar_duplicado` reintenta tras el aviso del 409 (A1)."""

    nombre: Nombre
    contacto: Contacto
    instagram: Instagram = None
    segmento: SegmentoCliente
    etiquetas: Etiquetas = []
    preferencias: str | None = None
    asesor_asignado_id: uuid.UUID | None = None
    confirmar_duplicado: bool = False


class ClienteEditar(Edicion):
    """Edición parcial de la ficha (CU-03, CU-30): solo cambian los campos enviados."""

    nombre: Nombre = omitible()
    contacto: Contacto = omitible()
    instagram: Instagram = None
    segmento: SegmentoCliente = omitible()
    etiquetas: Etiquetas = omitible()
    preferencias: str | None = None
    no_recontactar: bool = omitible()
    asesor_asignado_id: uuid.UUID | None = None


class ProblemaDuplicado(Problema):
    """409 del alta (CU-02 A1): trae los clientes que podrían ser el mismo."""

    duplicados: list[Cliente]


class OportunidadDelCliente(BaseModel):
    """Consulta del cliente, tal como aparece en su historial."""

    id: uuid.UUID
    destino_consultado: str
    estado: EstadoOportunidad
    fecha_desde_tentativa: date | None
    fecha_hasta_tentativa: date | None


class ViajeDelCliente(BaseModel):
    """Viaje del cliente, tal como aparece en su historial."""

    id: uuid.UUID
    destino_id: uuid.UUID
    estado: EstadoViaje
    fecha_salida: date
    fecha_regreso: date


class ResenaDelCliente(BaseModel):
    """Reseña que dejó el cliente, tal como aparece en su historial."""

    id: uuid.UUID
    hotel_id: uuid.UUID
    puntaje: int
    comentario: str
    fecha: date
    estado: EstadoResena


class HistorialCliente(BaseModel):
    """Memoria del cliente (CU-03): sus oportunidades, viajes y reseñas."""

    oportunidades: list[OportunidadDelCliente]
    viajes: list[ViajeDelCliente]
    resenas: list[ResenaDelCliente]
