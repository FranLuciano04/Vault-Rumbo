"""T-031: el servicio de escritura del catálogo de destinos exige el rol por sí mismo, sin
depender de la guardia de la ruta (RF-151, CU-26)."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import RolUsuario
from rumbo.negocio.errores import SinPermiso
from rumbo.negocio.servicios import configuracion
from tests.fabricas import DestinoFactory, UsuarioFactory, crear


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_crear_destino_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)

    with pytest.raises(SinPermiso):
        await configuracion.crear_destino(sesion, actor, nombre="Salta", pais="Argentina")


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_editar_destino_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    destino = await crear(sesion, DestinoFactory, nombre="Salta", activo=True)

    with pytest.raises(SinPermiso):
        await configuracion.editar_destino(sesion, actor, destino.id, {"nombre": "Jujuy"})

    await sesion.refresh(destino)
    assert destino.nombre == "Salta"


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_baja_de_destino_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    destino = await crear(sesion, DestinoFactory, nombre="Salta", activo=True)

    with pytest.raises(SinPermiso):
        await configuracion.dar_de_baja_destino(sesion, actor, destino.id)

    await sesion.refresh(destino)
    assert destino.activo is True


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_reactivar_destino_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    destino = await crear(sesion, DestinoFactory, nombre="Salta", activo=False)

    with pytest.raises(SinPermiso):
        await configuracion.reactivar_destino(sesion, actor, destino.id)

    await sesion.refresh(destino)
    assert destino.activo is False
