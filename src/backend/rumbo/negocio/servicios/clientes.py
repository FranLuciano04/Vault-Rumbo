"""Servicio del módulo clientes (CU-02)."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, RolUsuario, SegmentoCliente, Usuario
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.errores import DatosInvalidos, NoEncontrado, PosibleDuplicado
from rumbo.negocio.politicas import visibilidad

_clientes = RepositorioClientes()
_usuarios = RepositorioUsuarios()


async def registrar_cliente(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    nombre: str,
    contacto: str,
    instagram: str | None,
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
    if actor.rol is RolUsuario.freelance:
        asesor_asignado_id = actor.id
    elif asesor_asignado_id is not None:
        await _exigir_asesor_activo(sesion, actor, asesor_asignado_id)
    if not confirmar_duplicado:
        parecidos = await _clientes.buscar_parecidos(
            sesion, nombre=nombre, contacto=contacto, visibilidad=visibilidad(actor)
        )
        if parecidos:
            raise PosibleDuplicado(parecidos)
    cliente = Cliente(
        nombre=nombre,
        contacto=contacto,
        instagram=instagram,
        segmento=segmento,
        etiquetas=etiquetas,
        preferencias=preferencias,
        asesor_asignado_id=asesor_asignado_id,
    )
    sesion.add(cliente)
    await sesion.flush()
    return cliente


async def _exigir_asesor_activo(sesion: AsyncSession, actor: Usuario, asesor_id: uuid.UUID) -> None:
    """El asesor asignado tiene que ser un `Usuario` activo; si no, 422 sobre ese campo."""
    try:
        asesor = await _usuarios.obtener(sesion, asesor_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        asesor = None
    if asesor is None or not asesor.activo:
        raise DatosInvalidos("asesor_asignado_id", "El asesor asignado no existe o está de baja.")
