"""Servicio del módulo seguridad (CU-24, CU-25)."""

from collections.abc import Callable

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios

_usuarios = RepositorioUsuarios()


async def usuario_con_acceso(sesion: AsyncSession, firebase_uid: str) -> Usuario | None:
    """`Usuario` activo de la cuenta de Firebase, o `None` si no está en Rumbo o es una baja
    (CU-24 A1, RF-142)."""
    usuario = await _usuarios.buscar_por_firebase_uid(sesion, firebase_uid)
    if usuario is None or not usuario.activo:
        return None
    return usuario


async def asegurar_duena(
    sesion: AsyncSession, *, nombre: str, email: str, crear_cuenta: Callable[[str, str], str]
) -> Usuario:
    """`Usuario` dueno con su cuenta de Firebase; idempotente por email (DEC-0015, DEC-0016).

    `crear_cuenta(email, nombre)` devuelve el uid de la cuenta, creándola solo si no existe.
    """
    firebase_uid = crear_cuenta(email, nombre)
    duena = await _usuarios.buscar_por_email(sesion, email)
    if duena is None:
        duena = Usuario(nombre=nombre, email=email, firebase_uid=firebase_uid, rol=RolUsuario.dueno)
        sesion.add(duena)
        await sesion.flush()
    return duena
