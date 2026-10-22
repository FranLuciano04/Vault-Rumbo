"""Esquemas del módulo clientes (CU-02, CU-03, RF-031)."""

import uuid
from datetime import date
from typing import Annotated, Any

from pydantic import BaseModel, Field

from rumbo.datos.modelos import EstadoOportunidad, EstadoResena, EstadoViaje, SegmentoCliente
from rumbo.presentacion.esquemas.comunes import Auditoria, Problema

Nombre = Annotated[str, Field(min_length=1, max_length=120)]
Contacto = Annotated[str, Field(min_length=1, max_length=200)]
_OMITIDO: Any = None  # valor por defecto de un campo que no admite `null` pero puede omitirse


class Cliente(Auditoria):
    """Ficha del cliente: contacto, segmento, etiquetas y preferencias."""

    id: uuid.UUID
    nombre: Nombre
    contacto: Contacto
    segmento: SegmentoCliente
    etiquetas: list[str]
    preferencias: str | None
    no_recontactar: bool
    asesor_asignado_id: uuid.UUID | None


class ClienteCrear(BaseModel):
    """Alta de un cliente (CU-02). `confirmar_duplicado` reintenta tras el aviso del 409 (A1)."""

    nombre: Nombre
    contacto: Contacto
    segmento: SegmentoCliente
    etiquetas: list[str] = []
    preferencias: str | None = None
    asesor_asignado_id: uuid.UUID | None = None
    confirmar_duplicado: bool = False


class ClienteEditar(BaseModel):
    """Edición parcial de la ficha (CU-03, CU-30): solo cambian los campos enviados."""

    # Sin `None` en el tipo: omitir el campo lo deja igual, pero un `null` explícito es 422
    # (CU-03 A2: la ficha no puede quedar sin nombre ni contacto).
    nombre: Nombre = _OMITIDO
    contacto: Contacto = _OMITIDO
    segmento: SegmentoCliente = _OMITIDO
    etiquetas: list[str] = _OMITIDO
    preferencias: str | None = None
    no_recontactar: bool = _OMITIDO
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
