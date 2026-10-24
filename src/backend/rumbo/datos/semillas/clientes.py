"""Semilla de demo de M2 (T-049): clientes ficticios con segmentos, etiquetas y asesor."""

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, SegmentoCliente
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios

_clientes = RepositorioClientes()
_usuarios = RepositorioUsuarios()

# (nombre, contacto, segmento, etiquetas, email del asesor de demo o None)
_CLIENTES = [
    (
        "Familia Demo Pérez",
        "familia.perez@rumbo.test",
        SegmentoCliente.familia,
        ["Caribe", "Con niños"],
        "empleada.demo@rumbo.test",
    ),
    (
        "Grupo Demo Amigos del Sur",
        "+54 9 11 5555-0101",
        SegmentoCliente.amigos,
        ["Patagonia"],
        "empleada.demo@rumbo.test",
    ),
    (
        "Lucía Demo Gómez",
        "lucia.gomez@rumbo.test",
        SegmentoCliente.individual,
        ["Aventura"],
        "freelance.demo@rumbo.test",
    ),
    (
        "Pareja Demo Fernández",
        "+54 9 11 5555-0102",
        SegmentoCliente.pareja,
        ["Luna de miel", "Caribe"],
        None,
    ),
]


# Se busca por contacto (RF-003): un cliente ya cargado, aunque lo haya editado la agencia, no
# se vuelve a crear ni se pisa.
async def sembrar_clientes(sesion: AsyncSession) -> None:
    """Carga los clientes de demo de Clientes, idempotente. Corre después de la configuración,
    de la que toma los usuarios de demo como asesores."""
    for nombre, contacto, segmento, etiquetas, email_asesor in _CLIENTES:
        if await _clientes.existe_contacto(sesion, contacto=contacto):
            continue
        asesor = await _usuarios.buscar_por_email(sesion, email_asesor) if email_asesor else None
        sesion.add(
            Cliente(
                nombre=nombre,
                contacto=contacto,
                segmento=segmento,
                etiquetas=etiquetas,
                asesor_asignado_id=asesor.id if asesor else None,
            )
        )
        await sesion.flush()
