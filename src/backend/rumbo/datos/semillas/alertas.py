"""Semilla de demo de M3 (T-060): recordatorios manuales ficticios."""

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Alerta, EstadoAlerta, TipoAlerta
from rumbo.datos.repositorios.alertas import RepositorioAlertas
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios

_alertas = RepositorioAlertas()
_clientes = RepositorioClientes()
_usuarios = RepositorioUsuarios()

# (descripción, días desde hoy, email del responsable de demo, contacto del cliente o None)
_RECORDATORIOS = [
    (
        "Demo: llamar a la Familia Demo Pérez para cerrar la cotización",
        -2,
        "empleada.demo@rumbo.test",
        "familia.perez@rumbo.test",
    ),
    ("Demo: renovar el seguro de la agencia", -1, "freelance.demo@rumbo.test", None),
    (
        "Demo: enviar el itinerario al Grupo Demo Amigos del Sur",
        0,
        "empleada.demo@rumbo.test",
        "+54 9 11 5555-0101",
    ),
    ("Demo: pedir tarifas de hoteles a un operador", 0, "freelance.demo@rumbo.test", None),
    (
        "Demo: saludar a Lucía Demo Gómez por su cumpleaños",
        3,
        "freelance.demo@rumbo.test",
        "lucia.gomez@rumbo.test",
    ),
    ("Demo: armar el posteo de la semana", 5, "empleada.demo@rumbo.test", None),
]


# Se busca por descripción y responsable: un recordatorio ya cargado, aunque la agencia lo haya
# resuelto o pospuesto, no se vuelve a crear ni se pisa.
async def sembrar_alertas(sesion: AsyncSession) -> None:
    """Carga los recordatorios de demo, idempotente. Corre después de la de clientes, de la que
    toma los clientes, y de la configuración, de la que toma los responsables. Las fechas se
    calculan respecto del día en que corre y quedan fijas: volver a correrla no las renueva,
    porque así no pisa lo que hizo la agencia."""
    for descripcion, dias, email, contacto in _RECORDATORIOS:
        responsable = await _usuarios.buscar_por_email(sesion, email)
        if responsable is None:
            continue
        if await _alertas.existe_de_propietario(
            sesion, propietario_id=responsable.id, descripcion=descripcion
        ):
            continue
        cliente = None
        if contacto:
            cliente = await _clientes.buscar_por_contacto(sesion, contacto=contacto)
        sesion.add(
            Alerta(
                propietario_id=responsable.id,
                cliente_id=cliente.id if cliente else None,
                tipo=TipoAlerta.manual,
                descripcion=descripcion,
                fecha=hoy() + timedelta(days=dias),
                estado=EstadoAlerta.pendiente,
            )
        )
        await sesion.flush()
