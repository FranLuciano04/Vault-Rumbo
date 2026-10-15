"""STUB (test-writer, T-007): solo firmas para que los tests se puedan importar. Sin lógica."""

import enum
from typing import Any

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class RolUsuario(enum.Enum):
    pass


class TipoComision(enum.Enum):
    pass


class SegmentoCliente(enum.Enum):
    pass


class CanalOportunidad(enum.Enum):
    pass


class EstadoOportunidad(enum.Enum):
    pass


class MotivoPerdida(enum.Enum):
    pass


class Moneda(enum.Enum):
    pass


class EstadoCotizacion(enum.Enum):
    pass


class CategoriaViaje(enum.Enum):
    pass


class EstadoViaje(enum.Enum):
    pass


class TipoPago(enum.Enum):
    pass


class EstadoPago(enum.Enum):
    pass


class FormaPago(enum.Enum):
    pass


class TipoRequisito(enum.Enum):
    pass


class EstadoHotel(enum.Enum):
    pass


class EstadoResena(enum.Enum):
    pass


class TipoAlerta(enum.Enum):
    pass


class EstadoAlerta(enum.Enum):
    pass


class CanalContenido(enum.Enum):
    pass


class EstadoKanban(enum.Enum):
    pass


class Usuario:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Configuracion:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Destino:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class RequisitoDestino:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Operador:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Hotel:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Cliente:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Oportunidad:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Cotizacion:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Viaje:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Pago:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class ViajeHotel:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Resena:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class Alerta:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError


class ContenidoRed:
    def __init__(self, **campos: Any) -> None:
        raise NotImplementedError
