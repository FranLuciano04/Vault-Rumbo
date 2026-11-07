"""T-130: el servicio de redes exige el rol por sí mismo; el freelance nunca entra, tenga o no
la capacidad `acceso_redes` (RF-153, DEC-0008, DEC-0013)."""

from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import CanalContenido, RolUsuario
from rumbo.negocio.errores import SinPermiso
from rumbo.negocio.servicios import redes
from tests.fabricas import UsuarioFactory, crear


async def test_rf153_freelance_con_acceso_redes_recibe_sin_permiso(sesion: AsyncSession) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario.freelance, acceso_redes=True)

    with pytest.raises(SinPermiso):
        await redes.crear_contenido(
            sesion,
            actor,
            titulo="x",
            texto=None,
            canal=CanalContenido.instagram,
            fecha_publicacion=date(2026, 12, 1),
        )
