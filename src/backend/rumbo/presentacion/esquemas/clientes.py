"""Esquemas del módulo clientes (CU-02, CU-03, RF-031)."""

import uuid
from datetime import date
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field

from rumbo.core.contacto import es_contacto_valido
from rumbo.datos.modelos import EstadoOportunidad, EstadoResena, EstadoViaje, SegmentoCliente
from rumbo.presentacion.esquemas.comunes import Auditoria, Edicion, Entrada, Problema, omitible

Nombre = Annotated[str, Field(min_length=1, max_length=120)]
Contacto = Annotated[str, Field(min_length=1, max_length=200)]


def _exigir_telefono_o_email(contacto: str) -> str:
    if not es_contacto_valido(contacto):
        raise ValueError("Ingresá un teléfono o un email válido.")
    return contacto


# El de entrada exige teléfono o email (RF-002); el de salida no, por los datos ya guardados.
ContactoEntrada = Annotated[Contacto, AfterValidator(_exigir_telefono_o_email)]
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
    asesor: AsesorDelCliente | None = Field(
        description="Nombre del asesor asignado, también si está de baja."
    )

    model_config = ConfigDict(from_attributes=True)


class ClienteListado(Cliente):
    """Fila del listado (CU-03 paso 1): la ficha más su resumen."""

    ultimo_viaje: UltimoViajeDelCliente | None
    oportunidades_abiertas: int = Field(description="En `nueva`, `en_gestion` o `cotizada`.")


class ClienteCrear(Entrada):
    """Alta de un cliente (CU-02). `confirmar_duplicado` reintenta tras el aviso del 409 (A1)."""

    nombre: Nombre
    contacto: ContactoEntrada
    instagram: Instagram = None
    segmento: SegmentoCliente
    etiquetas: Etiquetas = []
    preferencias: str | None = None
    asesor_asignado_id: uuid.UUID | None = None
    confirmar_duplicado: bool = False


class ClienteEditar(Edicion):
    """Edición parcial de la ficha (CU-03, CU-30): solo cambian los campos enviados.

    `confirmar_duplicado` no es un campo de la ficha: guarda igual aunque el nombre o el contacto
    nuevos coincidan con otro cliente (RF-003, DEC-0020).
    """

    nombre: Nombre = omitible()
    contacto: ContactoEntrada = omitible()
    instagram: Instagram = None
    segmento: SegmentoCliente = omitible()
    etiquetas: Etiquetas = omitible()
    preferencias: str | None = None
    no_recontactar: bool = omitible()
    asesor_asignado_id: uuid.UUID | None = None
    confirmar_duplicado: bool = False


class ProblemaDuplicado(Problema):
    """409 del alta o de la edición (CU-02 A1, CU-03, DEC-0020): trae los clientes parecidos."""

    duplicados: list[Cliente]


class OportunidadDelCliente(BaseModel):
    """Consulta del cliente, tal como aparece en su historial."""

    id: uuid.UUID
    destino_consultado: str | None
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
