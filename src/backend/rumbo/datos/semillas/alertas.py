"""Semilla de demo de M3 (T-060): recordatorios manuales ficticios."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Alerta, Cliente, EstadoAlerta, TipoAlerta, Usuario

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
    toma los clientes, y de la configuración, de la que toma los responsables."""
    for descripcion, dias, email, contacto in _RECORDATORIOS:
        responsable = await sesion.scalar(select(Usuario).where(Usuario.email == email))
        if responsable is None:
            continue
        ya_cargado = await sesion.scalar(
            select(Alerta.id).where(
                Alerta.descripcion == descripcion, Alerta.propietario_id == responsable.id
            )
        )
        if ya_cargado is not None:
            continue
        cliente = (
            await sesion.scalar(select(Cliente).where(Cliente.contacto == contacto))
            if contacto
            else None
        )
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
