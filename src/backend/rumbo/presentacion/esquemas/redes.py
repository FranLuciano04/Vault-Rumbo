"""Esquemas del módulo redes: tablero de contenido y propuestas con IA (CU-19, CU-20, DEC-0012,
DEC-0013)."""

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from rumbo.datos.modelos import CanalContenido, EstadoKanban
from rumbo.presentacion.esquemas.comunes import (
    Auditoria,
    Edicion,
    Entrada,
    componer_con_auditoria,
    omitible,
)


class ContenidoRed(Auditoria):
    """Pieza de contenido del tablero kanban. Nace en `idea`; descartarla es baja lógica."""

    id: uuid.UUID = Field(json_schema_extra={"readOnly": True})
    usuario_id: uuid.UUID = Field(
        json_schema_extra={"readOnly": True}, description="Quien creó la pieza."
    )
    titulo: str
    texto: str | None = Field(description="Cuerpo del posteo; vacío si todavía es solo una idea.")
    canal: CanalContenido
    estado_kanban: EstadoKanban
    fecha_publicacion: date = Field(description="Fecha programada; la publicación es manual.")

    model_config = ConfigDict(from_attributes=True, json_schema_extra=componer_con_auditoria)


class ContenidoRedCrear(Entrada):
    """Alta de una pieza (CU-19, CU-20 paso 4): nace en la columna `idea`."""

    titulo: str = Field(min_length=1, max_length=200)
    texto: str | None = None
    canal: CanalContenido
    fecha_publicacion: date


class ContenidoRedEditar(Edicion):
    """Edita, reprograma (A2) o mueve la pieza entre columnas, en las dos direcciones (A5)."""

    titulo: str = omitible(min_length=1, max_length=200)
    texto: str | None = None
    canal: CanalContenido = omitible()
    estado_kanban: EstadoKanban = omitible()
    fecha_publicacion: date = omitible()


class PropuestaIAPedido(Entrada):
    """Lo único que recibe la IA: tema, canal y tono; no usa datos del negocio (CU-20)."""

    tema: str = Field(min_length=1, max_length=500, description="Tema o destino del posteo.")
    canal: CanalContenido
    tono: str | None = Field(
        default=None, max_length=200, description="Tono u objetivo, por ejemplo `cercano`."
    )


class BorradorContenido(BaseModel):
    """Texto propuesto por la IA. No es una pieza guardada: no tiene `id`."""

    titulo: str
    texto: str


class PropuestaIA(BaseModel):
    """Borradores para revisar y editar; guardar el elegido es un `POST /contenidos` (A2)."""

    borradores: list[BorradorContenido]
