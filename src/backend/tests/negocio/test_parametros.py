"""T-029: `parametros.obtener(sesion)` es la lectura de la fila única de `configuracion` que
usan los demás módulos (DEC-0013): vigencia (RF-022), anticipación (RF-035), recontacto (RF-027)."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Configuracion, RolUsuario
from rumbo.negocio.errores import SinPermiso
from rumbo.negocio.servicios import parametros
from tests.fabricas import UsuarioFactory, crear


async def test_rf022_obtener_devuelve_los_defaults(sesion: AsyncSession) -> None:
    cfg = await parametros.obtener(sesion)

    assert cfg.vigencia_cotizacion_meses == 1
    assert cfg.anticipacion_salida_dias == 7
    assert cfg.recontacto_meses == 6


async def test_rf035_obtener_devuelve_los_valores_vigentes(sesion: AsyncSession) -> None:
    fila = await sesion.get(Configuracion, 1)
    assert fila is not None
    fila.vigencia_cotizacion_meses = 4
    fila.anticipacion_salida_dias = 21
    fila.recontacto_meses = 10
    await sesion.flush()

    cfg = await parametros.obtener(sesion)

    assert cfg.vigencia_cotizacion_meses == 4
    assert cfg.anticipacion_salida_dias == 21
    assert cfg.recontacto_meses == 10


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_editar_parametros_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)

    with pytest.raises(SinPermiso):
        await parametros.editar(sesion, actor, 5, 5, 5)

    fila = await sesion.get(Configuracion, 1)
    assert fila is not None
    await sesion.refresh(fila)
    assert (fila.vigencia_cotizacion_meses, fila.anticipacion_salida_dias) == (1, 7)
    assert fila.recontacto_meses == 6


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_ver_parametros_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)

    with pytest.raises(SinPermiso):
        await parametros.ver(sesion, actor)
