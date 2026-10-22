"""T-030: el servicio de comisión por defecto exige el rol por sí mismo, sin depender de la
guardia de la ruta (RF-150, CU-13)."""

from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import RolUsuario, TipoComision
from rumbo.negocio.errores import SinPermiso
from rumbo.negocio.servicios.configuracion import configurar_comision_por_defecto
from tests.fabricas import UsuarioFactory, crear


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf150_servicio_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    vendedor = await crear(sesion, UsuarioFactory, rol=RolUsuario("empleado"), activo=True)

    with pytest.raises(SinPermiso):
        await configurar_comision_por_defecto(
            sesion, actor, vendedor.id, TipoComision("porcentaje"), Decimal("10")
        )

    await sesion.refresh(vendedor)
    assert vendedor.comision_default_tipo is None
    assert vendedor.comision_default_valor is None
