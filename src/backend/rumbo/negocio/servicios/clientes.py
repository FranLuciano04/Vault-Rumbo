"""Servicio del módulo clientes (CU-02, CU-03)."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.contacto import clave_contacto
from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Cliente, RolUsuario, SegmentoCliente, Usuario
from rumbo.datos.repositorios.base import normalizar
from rumbo.datos.repositorios.clientes import (
    HistorialDelCliente,
    RepositorioClientes,
    ResumenCliente,
)
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.errores import DatosInvalidos, NoEncontrado, PosibleDuplicado
from rumbo.negocio.politicas import exigir_escritura, visibilidad

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
    `PosibleDuplicado` (A1) salvo que `confirmar_duplicado` sea verdadero. Al `freelance` también
    se le avisa, sin candidatos, si un cliente ajeno tiene el mismo contacto (no el mismo nombre).
    El `freelance` queda como asesor asignado de lo que da de alta, sin importar lo que envíe.
    """
    if actor.rol is RolUsuario.freelance:
        asesor_asignado_id = actor.id
    elif asesor_asignado_id is not None:
        await _exigir_asesor_activo(sesion, actor, asesor_asignado_id)
    # Dos altas simultáneas con los mismos datos no se saltean el aviso: la segunda espera, incluso
    # la confirmada (que nunca se rechaza, DEC-0020), para que la otra la vea al re-consultar.
    await _clientes.bloquear_alta(sesion, nombre=nombre, contacto=contacto)
    if not confirmar_duplicado:
        parecidos = await _clientes.buscar_parecidos(
            sesion, nombre=nombre, contacto=contacto, visibilidad=visibilidad(actor)
        )
        if parecidos:
            raise PosibleDuplicado(parecidos)
        if actor.rol is RolUsuario.freelance and await _clientes.existe_contacto(
            sesion, contacto=contacto
        ):
            raise PosibleDuplicado([])  # avisa que hay uno, sin mostrar fichas ajenas (A1)
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
    await sesion.refresh(cliente, ["asesor"])
    return cliente


async def buscar_clientes(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    buscar: str | None,
    etiquetas: list[str],
    segmento: SegmentoCliente | None,
    mios: bool,
    desplazamiento: int,
    limite: int,
) -> tuple[list[tuple[Cliente, ResumenCliente]], int]:
    """Página de clientes por nombre, cada uno con su resumen, y el total (CU-03, RF-005, RF-031).

    `mios` deja solo los que el actor tiene asignados (RF-009). Lo que ve cada rol lo decide
    `visibilidad`, no el filtro: el `freelance` recibe solo los suyos aunque no pida `mios`
    (RF-151).
    """
    vista = visibilidad(actor)
    pagina, total = await _clientes.paginar(
        sesion,
        buscar=buscar,
        etiquetas=etiquetas,
        segmento=segmento,
        asesor_id=actor.id if mios else None,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=vista,
    )
    resumenes = await _clientes.resumir(sesion, pagina, hoy=hoy(), visibilidad=vista)
    return [(c, resumenes[c.id]) for c in pagina], total


async def listar_etiquetas(sesion: AsyncSession, actor: Usuario) -> list[str]:
    """Etiquetas en uso entre los clientes que el actor ve (RF-031, RF-151)."""
    return await _clientes.etiquetas_en_uso(sesion, visibilidad=visibilidad(actor))


async def obtener_cliente(sesion: AsyncSession, actor: Usuario, cliente_id: uuid.UUID) -> Cliente:
    """Ficha de un `Cliente` (CU-03). Uno que el actor no ve es `NoEncontrado`, igual que uno
    inexistente (A1, RF-151)."""
    return await _clientes.obtener(sesion, cliente_id, visibilidad=visibilidad(actor))


async def obtener_historial(
    sesion: AsyncSession, actor: Usuario, cliente_id: uuid.UUID
) -> HistorialDelCliente:
    """Oportunidades, viajes y reseñas de un `Cliente` (CU-03 paso 3, RF-006). Si el actor no ve
    al cliente es `NoEncontrado` (A1, RF-151)."""
    vista = visibilidad(actor)
    await _clientes.obtener(sesion, cliente_id, visibilidad=vista)
    return await _clientes.historial(sesion, cliente_id, visibilidad=vista)


async def editar_cliente(
    sesion: AsyncSession,
    actor: Usuario,
    cliente_id: uuid.UUID,
    cambios: dict[str, Any],
    *,
    confirmar_duplicado: bool = False,
) -> Cliente:
    """Aplica solo los campos enviados a la ficha (CU-03, CU-30, RF-007). Los `Cliente` no se
    borran (RF-008). El `freelance` conserva su asignación, como en el alta (RF-150).

    Si el nombre o el contacto cambian de verdad (reescribirlos igual no cuenta) y coinciden con
    otro `Cliente` que el actor ve, corta con `PosibleDuplicado` salvo `confirmar_duplicado`
    (CU-03, RF-003, DEC-0020); solo se mira lo que cambió y nunca a la propia ficha. Al
    `freelance` también se le avisa, sin candidatos, si un cliente ajeno tiene el mismo contacto
    (RF-151).
    """
    cliente = await _clientes.obtener(sesion, cliente_id, visibilidad=visibilidad(actor))
    exigir_escritura(actor, cliente)
    if actor.rol is RolUsuario.freelance:
        cambios = {c: v for c, v in cambios.items() if c != "asesor_asignado_id"}
    elif cambios.get("asesor_asignado_id") is not None:
        await _exigir_asesor_activo(sesion, actor, cambios["asesor_asignado_id"])
    await _avisar_si_duplica(sesion, actor, cliente, cambios, confirmar_duplicado)
    for campo, valor in cambios.items():
        setattr(cliente, campo, valor)
    await sesion.flush()
    await sesion.refresh(cliente, ["asesor"])
    return cliente


async def _avisar_si_duplica(
    sesion: AsyncSession,
    actor: Usuario,
    cliente: Cliente,
    cambios: dict[str, Any],
    confirmar_duplicado: bool,
) -> None:
    """Corta con `PosibleDuplicado` si el nombre o el contacto que cambian ya los tiene otro
    cliente (RF-003). Toma el mismo bloqueo que el alta, así alta y edición se serializan."""
    nombre = cambios.get("nombre")
    contacto = cambios.get("contacto")
    cambia_nombre = nombre is not None and normalizar(nombre) != normalizar(cliente.nombre)
    cambia_contacto = contacto is not None and clave_contacto(contacto) != clave_contacto(
        cliente.contacto
    )
    if not (cambia_nombre or cambia_contacto):
        return
    await _clientes.bloquear_alta(
        sesion, nombre=nombre or cliente.nombre, contacto=contacto or cliente.contacto
    )
    if confirmar_duplicado:
        return
    parecidos = await _clientes.buscar_parecidos(
        sesion,
        nombre=nombre if cambia_nombre else None,
        contacto=contacto if cambia_contacto else None,
        visibilidad=visibilidad(actor),
        excluir_id=cliente.id,
    )
    if parecidos:
        raise PosibleDuplicado(parecidos)
    if (
        actor.rol is RolUsuario.freelance
        and contacto is not None
        and cambia_contacto
        and await _clientes.existe_contacto(sesion, contacto=contacto, excluir_id=cliente.id)
    ):
        raise PosibleDuplicado([])  # avisa que hay uno, sin mostrar fichas ajenas (A1)


async def _exigir_asesor_activo(sesion: AsyncSession, actor: Usuario, asesor_id: uuid.UUID) -> None:
    """El asesor asignado tiene que ser un `Usuario` activo; si no, 422 sobre ese campo."""
    try:
        asesor = await _usuarios.obtener(sesion, asesor_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        asesor = None
    if asesor is None or not asesor.activo:
        raise DatosInvalidos("asesor_asignado_id", "El asesor asignado no existe o está de baja.")
