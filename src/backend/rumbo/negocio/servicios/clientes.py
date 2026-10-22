"""Servicio del módulo clientes (CU-02)."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, RolUsuario, SegmentoCliente, Usuario
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.negocio.errores import PosibleDuplicado
from rumbo.negocio.politicas import visibilidad

_clientes = RepositorioClientes()


async def registrar_cliente(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    nombre: str,
    contacto: str,
    segmento: SegmentoCliente,
    etiquetas: list[str],
    preferencias: str | None,
    asesor_asignado_id: uuid.UUID | None,
    confirmar_duplicado: bool,
) -> Cliente:
    """Da de alta un `Cliente` (CU-02, RF-001..RF-003, RF-150).

    Si hay uno con el mismo contacto o nombre entre los que el actor ve, corta con
    `PosibleDuplicado` (A1) salvo que `confirmar_duplicado` sea verdadero. El `freelance` queda
    como asesor asignado de lo que da de alta, sin importar lo que envíe.
    """
    if not confirmar_duplicado:
        parecidos = await _clientes.buscar_parecidos(
            sesion, nombre=nombre, contacto=contacto, visibilidad=visibilidad(actor)
        )
        if parecidos:
            raise PosibleDuplicado(parecidos)
    cliente = Cliente(
        nombre=nombre,
        contacto=contacto,
        segmento=segmento,
        etiquetas=etiquetas,
        preferencias=preferencias,
        asesor_asignado_id=actor.id if actor.rol is RolUsuario.freelance else asesor_asignado_id,
    )
    sesion.add(cliente)
    await sesion.flush()
    return cliente
