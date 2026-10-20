"""Visibilidad por fila y permisos por rol (DEC-0005 §2, DEC-0008 §3; RF-150, RF-151).

Lectura: para `empleado`, `admin` y `dueno` es **global** (toda la agencia, DEC-0005), salvo las
`Alerta` ajenas y las `Resena` ocultas, que solo ven `admin` y `dueno`. Para el `freelance` es
**cerrada por defecto**: ve el catálogo y lo propio, y un modelo que no figura acá le queda
invisible. Escritura: un registro de tipo desconocido no lo escribe nadie. Sumar una entidad
nueva obliga a decidir su regla en este archivo.

La visibilidad por fila **no protege** lo que la lectura global deja abierto: los servicios de
`Usuario`, `Configuracion` y redes (`ContenidoRed`) deben llamar a `exigir_rol` (o chequear la
capacidad `acceso_redes`) antes de leer o escribir.
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import ColumnElement, Select, false, or_, select

from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    Cotizacion,
    Destino,
    EstadoResena,
    Hotel,
    Operador,
    Oportunidad,
    Pago,
    RequisitoDestino,
    Resena,
    RolUsuario,
    Usuario,
    Viaje,
    ViajeHotel,
)
from rumbo.negocio.errores import SinPermiso

_JEFES = (RolUsuario.admin, RolUsuario.dueno)

# Catálogo compartido: lo lee todo rol, también el freelance (DEC-0008 §3, sync 30/09).
# Las reseñas ocultas no, por la regla de `_RESTRINGIDO_SALVO_JEFES`.
_CATALOGO: frozenset[type] = frozenset({Hotel, Resena, Destino, RequisitoDestino, Operador})

# Filas que solo admin y dueño ven completas; el resto de los roles, incluido el empleado, ve esto.
_RESTRINGIDO_SALVO_JEFES: dict[type, Callable[[uuid.UUID], ColumnElement[bool]]] = {
    Alerta: lambda actor_id: Alerta.propietario_id == actor_id,  # agenda propia (DEC-0005)
    # La reseña oculta deja de mostrarse en el catálogo (CU-29).
    Resena: lambda _: Resena.estado == EstadoResena.publicada,
}


def _clientes_propios(actor_id: uuid.UUID) -> Select[uuid.UUID]:
    return select(Cliente.id).where(Cliente.asesor_asignado_id == actor_id)


def _oportunidad_propia(actor_id: uuid.UUID) -> ColumnElement[bool]:
    return or_(
        Oportunidad.cliente_id.in_(_clientes_propios(actor_id)),
        Oportunidad.responsable_id == actor_id,
    )


def _viaje_propio(actor_id: uuid.UUID) -> ColumnElement[bool]:
    return or_(
        Viaje.cliente_id.in_(_clientes_propios(actor_id)),
        Viaje.responsable_id == actor_id,
    )


def _viajes_propios(actor_id: uuid.UUID) -> Select[uuid.UUID]:
    return select(Viaje.id).where(_viaje_propio(actor_id))


# Lo propio del freelance: sus clientes y lo que cuelga de ellos o de lo que tiene a cargo.
_PROPIO_DEL_FREELANCE: dict[type, Callable[[uuid.UUID], ColumnElement[bool]]] = {
    Cliente: lambda actor_id: Cliente.asesor_asignado_id == actor_id,
    Oportunidad: _oportunidad_propia,
    Cotizacion: lambda actor_id: Cotizacion.oportunidad_id.in_(
        select(Oportunidad.id).where(_oportunidad_propia(actor_id))
    ),
    Viaje: _viaje_propio,
    Pago: lambda actor_id: Pago.viaje_id.in_(_viajes_propios(actor_id)),
    ViajeHotel: lambda actor_id: ViajeHotel.viaje_id.in_(_viajes_propios(actor_id)),
}


@dataclass(frozen=True)
class FiltroVisibilidad:
    """Qué filas ve un actor; los repositorios lo reciben como parámetro obligatorio."""

    actor_id: uuid.UUID
    rol: RolUsuario

    def aplicar[S: Select[Any]](self, consulta: S, modelo: type) -> S:
        """Agrega a `consulta` la condición de visibilidad del actor sobre `modelo`."""
        condicion = self._condicion(modelo)
        return consulta if condicion is None else consulta.where(condicion)

    def _condicion(self, modelo: type) -> ColumnElement[bool] | None:
        if self.rol in _JEFES:
            return None
        restringido = _RESTRINGIDO_SALVO_JEFES.get(modelo)
        if restringido is not None:
            return restringido(self.actor_id)
        if self.rol is RolUsuario.empleado:
            return None
        if modelo in _CATALOGO:
            return None
        propio = _PROPIO_DEL_FREELANCE.get(modelo)
        return false() if propio is None else propio(self.actor_id)


def visibilidad(actor: Usuario) -> FiltroVisibilidad:
    """Filtro por fila del actor: el freelance ve lo propio; el resto, toda la agencia (RF-151)."""
    return FiltroVisibilidad(actor_id=actor.id, rol=actor.rol)


def exigir_rol(actor: Usuario, *roles: RolUsuario) -> None:
    """`SinPermiso` si el rol del actor no está entre `roles` (RF-150)."""
    if actor.rol not in roles:
        raise SinPermiso("Tu rol no permite esta acción")


def tiene_acceso_redes(actor: Usuario) -> bool:
    """Si el actor entra al módulo de redes: admin y dueño siempre, por rol; el resto, según
    su columna `acceso_redes` (DEC-0013)."""
    return actor.rol in _JEFES or actor.acceso_redes


def _escribe_cliente(actor: Usuario, cliente: Cliente) -> bool:
    return actor.rol is not RolUsuario.freelance or cliente.asesor_asignado_id == actor.id


def _escribe_operacion(actor: Usuario, registro: Oportunidad | Viaje) -> bool:
    return actor.rol in _JEFES or registro.responsable_id == actor.id


def _escribe_alerta(actor: Usuario, alerta: Alerta) -> bool:
    return alerta.propietario_id == actor.id


def exigir_escritura(actor: Usuario, registro: object) -> None:
    """`SinPermiso` si el actor no puede modificar `registro` según DEC-0005 §2 (RF-150).

    Para `Pago`, `ViajeHotel` y `Cotizacion` el servicio pasa el `Viaje` o la `Oportunidad` padre.
    Que el freelance cree un `Cliente` como suyo (`asesor_asignado` = él) lo resuelve el servicio.
    """
    if isinstance(registro, Cliente):
        permitido = _escribe_cliente(actor, registro)
    elif isinstance(registro, Oportunidad | Viaje):
        permitido = _escribe_operacion(actor, registro)
    elif isinstance(registro, Alerta):
        permitido = _escribe_alerta(actor, registro)
    else:
        permitido = False
    if not permitido:
        raise SinPermiso("No podés modificar este registro")
