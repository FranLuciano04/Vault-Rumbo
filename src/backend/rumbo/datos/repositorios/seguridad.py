"""Repositorio del módulo seguridad: `Usuario` (CU-24, CU-25)."""

import uuid

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioUsuarios(RepositorioBase[Usuario]):
    modelo = Usuario

    async def buscar_por_firebase_uid(
        self, sesion: AsyncSession, firebase_uid: str
    ) -> Usuario | None:
        """Usuario dueño de la cuenta de Firebase. Sin filtro de visibilidad: es la búsqueda
        que identifica al actor, antes de que exista uno (DEC-0016)."""
        return await sesion.scalar(select(Usuario).where(Usuario.firebase_uid == firebase_uid))

    async def buscar_por_email(self, sesion: AsyncSession, email: str) -> Usuario | None:
        """Usuario con ese email, sin distinguir mayúsculas. Sin filtro de visibilidad: la usan
        `datos-iniciales`, que corre sin actor, y el chequeo de email libre del alta."""
        consulta = select(Usuario).where(func.lower(Usuario.email) == email.lower())
        return await sesion.scalar(consulta.limit(1))

    async def bloquear_email(self, sesion: AsyncSession, email: str) -> None:
        """Bloqueo transaccional (advisory lock) del email, sin distinguir mayúsculas, hasta el
        fin de la transacción: dos altas simultáneas del mismo email van de a una (T-153)."""
        await sesion.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(lower(:email), 0))"),
            {"email": email},
        )

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        activo: bool | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Usuario], int]:
        """Página de usuarios ordenada por nombre y el total; `activo=None` trae altas y bajas."""
        consulta = visibilidad.aplicar(select(Usuario), Usuario)
        if activo is not None:
            consulta = consulta.where(Usuario.activo == activo)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(Usuario.nombre, Usuario.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

    async def listar_activos(self, sesion: AsyncSession) -> list[Usuario]:
        """Los usuarios activos de cualquier rol, ordenados por nombre. Sin filtro de visibilidad:
        el servicio decide qué roles lo piden."""
        consulta = (
            select(Usuario).where(Usuario.activo.is_(True)).order_by(Usuario.nombre, Usuario.id)
        )
        return list(await sesion.scalars(consulta))

    async def contar_admins_activos(self, sesion: AsyncSession, *, visibilidad: Visibilidad) -> int:
        """Cuántos `admin` activos hay, bloqueando sus filas (en orden de id) hasta el fin de la
        transacción: dos pedidos simultáneos no pueden dejar cada uno al otro como último admin
        (RF-149)."""
        consulta = select(Usuario.id).where(
            Usuario.rol == RolUsuario.admin, Usuario.activo.is_(True)
        )
        consulta = visibilidad.aplicar(consulta, Usuario).order_by(Usuario.id).with_for_update()
        return len((await sesion.scalars(consulta)).all())

    async def obtener_bloqueado(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Usuario:
        """Como `obtener`, pero bloquea la fila hasta el fin de la transacción y la relee aunque
        ya esté en la sesión: los chequeos sobre su rol no ven un valor viejo."""
        consulta = (
            select(Usuario)
            .where(Usuario.id == id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        usuario = await sesion.scalar(visibilidad.aplicar(consulta, Usuario))
        if usuario is None:
            raise NoEncontrado(f"Usuario {id} no encontrado")
        return usuario
