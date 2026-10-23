"""Servicio del módulo seguridad (CU-24, CU-25)."""

import logging
import uuid
from collections.abc import Callable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import Conflicto
from rumbo.core.seguridad import CuentaYaExiste, GestorDeCuentas
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.politicas import exigir_rol, visibilidad

logger = logging.getLogger(__name__)

_usuarios = RepositorioUsuarios()
_EMAIL_EN_USO = "Ya existe un usuario con ese email."


async def usuario_con_acceso(sesion: AsyncSession, firebase_uid: str) -> Usuario | None:
    """`Usuario` activo de la cuenta de Firebase, o `None` si no está en Rumbo o es una baja
    (CU-24 A1, RF-142)."""
    usuario = await _usuarios.buscar_por_firebase_uid(sesion, firebase_uid)
    if usuario is None or not usuario.activo:
        return None
    return usuario


async def asegurar_duena(
    sesion: AsyncSession, *, nombre: str, email: str, crear_cuenta: Callable[[str, str], str]
) -> tuple[Usuario, bool]:
    """`Usuario` dueno con su cuenta de Firebase, y si se creó recién; idempotente por email
    (sin distinguir mayúsculas) y por `firebase_uid` (DEC-0015, DEC-0016).

    `crear_cuenta(email, nombre)` devuelve el uid de la cuenta, creándola solo si no existe.
    Si el `Usuario` existe con otro uid se lo actualiza; si no es `dueno` o está dado de baja
    se corta con `Conflicto` (no se lo reactiva ni se le cambia el rol).
    """
    email = email.strip().lower()
    firebase_uid = crear_cuenta(email, nombre)
    duena = await _usuarios.buscar_por_firebase_uid(
        sesion, firebase_uid
    ) or await _usuarios.buscar_por_email(sesion, email)
    if duena is None:
        duena = Usuario(nombre=nombre, email=email, firebase_uid=firebase_uid, rol=RolUsuario.dueno)
        sesion.add(duena)
        await sesion.flush()
        return duena, True
    if duena.rol != RolUsuario.dueno or not duena.activo:
        raise Conflicto(
            f"{email} ya existe como Usuario con rol {duena.rol.value}"
            f"{'' if duena.activo else ' y está dado de baja'}: no es la dueña activa."
        )
    if duena.firebase_uid != firebase_uid:
        duena.firebase_uid = firebase_uid
        await sesion.flush()
    return duena, False


async def listar_usuarios(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    activo: bool | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Usuario], int]:
    """Página del padrón de usuarios con rol y estado, y el total (CU-25 paso 2, RF-144)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    return await _usuarios.paginar(
        sesion,
        activo=activo,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def obtener_usuario(sesion: AsyncSession, actor: Usuario, usuario_id: uuid.UUID) -> Usuario:
    """Un `Usuario`, activo o no (CU-25)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    return await _usuarios.obtener(sesion, usuario_id, visibilidad=visibilidad(actor))


async def crear_usuario(
    sesion: AsyncSession,
    actor: Usuario,
    gestor: GestorDeCuentas,
    *,
    nombre: str,
    email: str,
    rol: RolUsuario,
    acceso_redes: bool = False,
) -> Usuario:
    """Da de alta un `Usuario` con su cuenta de Firebase y le hace mandar a Firebase el mail para
    elegir la contraseña (CU-25 pasos 3 a 5, RF-144, RF-145, DEC-0016).

    Email repetido en Rumbo o en Firebase: `Conflicto` sin crear nada (A1, RF-146). Si después
    de crear la cuenta falla la base o el envío del mail, la cuenta se borra (compensación) y
    no queda `Usuario`.
    """
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    email = email.strip().lower()
    if await _usuarios.buscar_por_email(sesion, email) is not None:
        raise Conflicto(_EMAIL_EN_USO)
    try:
        firebase_uid = await gestor.crear_cuenta(email, nombre)
    except CuentaYaExiste as error:
        raise Conflicto(_EMAIL_EN_USO) from error
    try:
        # Savepoint: si falla el mail, se deshace el INSERT aunque la sesión siga abierta.
        async with sesion.begin_nested():
            usuario = Usuario(
                nombre=nombre,
                email=email,
                firebase_uid=firebase_uid,
                rol=rol,
                acceso_redes=acceso_redes,
            )
            sesion.add(usuario)
            await sesion.flush()
            await gestor.enviar_mail_restablecimiento(email)
    except Exception as error:
        await _borrar_cuenta_creada(gestor, firebase_uid)
        if isinstance(error, IntegrityError):  # carrera con otra alta del mismo email o uid
            raise Conflicto("Ya existe un usuario con ese email o esa cuenta.") from error
        raise
    return usuario


async def _borrar_cuenta_creada(gestor: GestorDeCuentas, firebase_uid: str) -> None:
    """Compensación del alta; si también falla, se loguea y manda el error original."""
    try:
        await gestor.borrar_cuenta(firebase_uid)
    except Exception:
        logger.exception(
            "No se pudo borrar la cuenta de Firebase %s del alta fallida", firebase_uid
        )
