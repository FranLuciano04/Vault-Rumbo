"""Servicio del módulo seguridad (CU-24, CU-25)."""

import logging
import uuid
from collections.abc import Callable
from typing import Any

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


async def listar_asesores(sesion: AsyncSession, actor: Usuario) -> list[Usuario]:
    """Usuarios activos que pueden quedar como asesor de un cliente, por nombre (RF-007, RF-151).
    Los pide quien puede reasignar clientes; el `freelance` no (`SinPermiso`)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado)
    return await _usuarios.listar_activos(sesion)


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

    Email repetido en Rumbo (sin distinguir mayúsculas): `Conflicto` sin tocar Firebase (A1,
    RF-146). El email se bloquea hasta el fin de la transacción, así dos altas simultáneas van
    de a una y la segunda ve el `Usuario` de la primera. Si el email ya tiene cuenta en
    Firebase pero ningún `Usuario` (un alta anterior quedó a medias), esa cuenta se borra y se
    crea una nueva, sin credenciales previas (A1, T-153). Si después falla la base o el envío
    del mail, o el pedido se cancela, la cuenta se borra (compensación) y no queda `Usuario`.
    """
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    if rol is RolUsuario.dueno:
        exigir_rol(actor, RolUsuario.dueno)
    email = email.strip().lower()
    await _usuarios.bloquear_email(sesion, email)
    if await _usuarios.buscar_por_email(sesion, email) is not None:
        raise Conflicto(_EMAIL_EN_USO)
    firebase_uid = await _crear_cuenta_nueva(sesion, gestor, email, nombre)
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
    except BaseException as error:  # también `CancelledError` si el cliente corta
        await _borrar_cuenta_creada(gestor, firebase_uid)
        if isinstance(error, IntegrityError):  # carrera con otra alta del mismo email o uid
            raise Conflicto("Ya existe un usuario con ese email o esa cuenta.") from error
        raise
    return usuario


async def editar_usuario(
    sesion: AsyncSession, actor: Usuario, usuario_id: uuid.UUID, cambios: dict[str, Any]
) -> Usuario:
    """Aplica solo los campos enviados: `nombre`, `rol` y `acceso_redes` (CU-25 A2, RF-147).

    Asignar o quitar el rol `dueno` es solo de la dueña (403 para el admin); reenviar el rol
    que ya tiene no es un cambio. Quitarle el rol al último `admin` activo da `Conflicto` (A4,
    RF-149).
    """
    usuario, admins_activos = await _bloquear_para_cambiar(sesion, actor, usuario_id)
    if "rol" in cambios:
        rol = RolUsuario(cambios["rol"])
        cambios = {**cambios, "rol": rol}
        if rol is not usuario.rol:
            if RolUsuario.dueno in (rol, usuario.rol):
                exigir_rol(actor, RolUsuario.dueno)
            _exigir_otro_admin_activo(usuario, admins_activos)
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)
    await sesion.flush()
    return usuario


async def dar_de_baja_usuario(
    sesion: AsyncSession, actor: Usuario, gestor: GestorDeCuentas, usuario_id: uuid.UUID
) -> Usuario:
    """Baja lógica: `activo = false` y la cuenta de Firebase deshabilitada; desde el pedido
    siguiente el usuario recibe 401 (CU-25 A3, RF-148, DEC-0016).

    A una dueña solo la da de baja otra dueña (403 para el admin). Bajar al último `admin`
    activo da `Conflicto` (A4, RF-149). La cuenta se deshabilita antes de tocar la base: si
    Firebase falla, responde 502 y el usuario sigue activo; si después falla la base, la cuenta
    queda deshabilitada y la baja se puede reintentar.
    """
    usuario, admins_activos = await _bloquear_para_cambiar(sesion, actor, usuario_id)
    if usuario.rol is RolUsuario.dueno:
        exigir_rol(actor, RolUsuario.dueno)
    _exigir_otro_admin_activo(usuario, admins_activos)
    await gestor.deshabilitar_cuenta(usuario.firebase_uid)
    usuario.activo = False
    await sesion.flush()
    return usuario


async def _bloquear_para_cambiar(
    sesion: AsyncSession, actor: Usuario, usuario_id: uuid.UUID
) -> tuple[Usuario, int]:
    """El `Usuario` a editar o dar de baja, releído y bloqueado, y cuántos `admin` activos hay.

    Bloquea siempre en el mismo orden, primero los admin activos (por id) y después el
    objetivo, para que dos cambios simultáneos no se traben entre sí (deadlock) ni decidan
    con un rol viejo (RF-147, RF-149).
    """
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    filtro = visibilidad(actor)
    admins_activos = await _usuarios.contar_admins_activos(sesion, visibilidad=filtro)
    usuario = await _usuarios.obtener_bloqueado(sesion, usuario_id, visibilidad=filtro)
    return usuario, admins_activos


def _exigir_otro_admin_activo(usuario: Usuario, admins_activos: int) -> None:
    """`Conflicto` si `usuario` es el único `admin` activo: el sistema nunca queda sin uno."""
    if usuario.rol is RolUsuario.admin and usuario.activo and admins_activos <= 1:
        raise Conflicto("Es el único administrador activo: asigná otro antes de cambiarlo.")


async def _crear_cuenta_nueva(
    sesion: AsyncSession, gestor: GestorDeCuentas, email: str, nombre: str
) -> str:
    """uid de una cuenta de Firebase creada por este pedido. Si el email ya tiene cuenta (sin
    `Usuario`: quien llama ya lo comprobó con el email bloqueado), se la borra y se crea otra,
    porque sus credenciales podrían ser de otra persona (pre-account hijacking, T-153). Si la
    cuenta desaparece entre las dos llamadas, se reintenta crear una sola vez.

    Si esa cuenta es de un `Usuario` con otro email (se lo cambiaron en Firebase), `Conflicto`
    sin borrar nada."""
    try:
        return await gestor.crear_cuenta(email, nombre)
    except CuentaYaExiste:
        cuenta_previa = await gestor.buscar_uid_por_email(email)
        if cuenta_previa is not None:
            if await _usuarios.buscar_por_firebase_uid(sesion, cuenta_previa) is not None:
                raise Conflicto(_EMAIL_EN_USO) from None
            await gestor.borrar_cuenta(cuenta_previa)
    try:
        return await gestor.crear_cuenta(email, nombre)
    except CuentaYaExiste as error:  # la volvieron a crear fuera de Rumbo
        raise Conflicto(_EMAIL_EN_USO) from error


async def _borrar_cuenta_creada(gestor: GestorDeCuentas, firebase_uid: str) -> None:
    """Compensación del alta; si también falla, se loguea y manda el error original."""
    try:
        await gestor.borrar_cuenta(firebase_uid)
    except Exception:
        logger.exception(
            "No se pudo borrar la cuenta de Firebase %s del alta fallida", firebase_uid
        )
