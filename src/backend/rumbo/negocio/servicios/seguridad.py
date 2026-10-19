"""Servicio del módulo seguridad (CU-24, CU-25)."""

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Usuario
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios

_usuarios = RepositorioUsuarios()


async def usuario_con_acceso(sesion: AsyncSession, firebase_uid: str) -> Usuario | None:
    """`Usuario` activo de la cuenta de Firebase, o `None` si no está en Rumbo o es una baja
    (CU-24 A1, RF-142)."""
    usuario = await _usuarios.buscar_por_firebase_uid(sesion, firebase_uid)
    if usuario is None or not usuario.activo:
        return None
    return usuario
