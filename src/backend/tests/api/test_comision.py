"""T-030: comisión por defecto de un vendedor (CU-13, RF-083, RF-084, RF-085, DEC-0007).

El contrato (roles, 403, forma del cuerpo) ya lo cubre `test_contrato_m1.py`; acá se fija el
comportamiento: qué se guarda, qué se devuelve y qué no se toca.
"""

import uuid
from collections.abc import Awaitable, Callable
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import RolUsuario, TipoComision, Usuario
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
Fabrica = Callable[[str], Awaitable[AsyncClient]]


def _url(usuario_id: uuid.UUID) -> str:
    return f"/api/usuarios/{usuario_id}/comision-por-defecto"


async def _vendedor(sesion: AsyncSession, **campos: Any) -> Usuario:
    return await crear(sesion, UsuarioFactory, rol=RolUsuario("empleado"), activo=True, **campos)


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf083_define_porcentaje(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    vendedor = await _vendedor(sesion)

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": "12.50"},
    )

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(vendedor.id)
    assert cuerpo["comision_default_tipo"] == "porcentaje"
    assert Decimal(cuerpo["comision_default_valor"]) == Decimal("12.50")
    await sesion.refresh(vendedor)
    assert vendedor.comision_default_tipo == TipoComision("porcentaje")
    assert isinstance(vendedor.comision_default_valor, Decimal)
    assert vendedor.comision_default_valor == Decimal("12.50")


async def test_rf083_define_importe(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(sesion)

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "importe", "comision_default_valor": "15000.50"},
    )

    assert r.status_code == 200
    assert r.json()["comision_default_tipo"] == "importe"
    assert Decimal(r.json()["comision_default_valor"]) == Decimal("15000.50")
    await sesion.refresh(vendedor)
    assert vendedor.comision_default_tipo == TipoComision("importe")
    assert vendedor.comision_default_valor == Decimal("15000.50")


@pytest.mark.parametrize("valor", ["0", "100"])
async def test_rf083_porcentaje_acepta_los_bordes_0_y_100(
    cliente_como: Fabrica, sesion: AsyncSession, valor: str
) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(sesion)

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": valor},
    )

    assert r.status_code == 200
    assert Decimal(r.json()["comision_default_valor"]) == Decimal(valor)


async def test_rf083_reemplaza_la_comision_anterior(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(
        sesion,
        comision_default_tipo=TipoComision("importe"),
        comision_default_valor=Decimal("5000.00"),
    )

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": "8"},
    )

    assert r.status_code == 200
    await sesion.refresh(vendedor)
    assert vendedor.comision_default_tipo == TipoComision("porcentaje")
    assert vendedor.comision_default_valor == Decimal("8.00")


async def test_rf083_quitar_la_comision_deja_tipo_y_valor_en_null(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(
        sesion,
        comision_default_tipo=TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": None, "comision_default_valor": None},
    )

    assert r.status_code == 200
    assert r.json()["comision_default_tipo"] is None
    assert r.json()["comision_default_valor"] is None
    await sesion.refresh(vendedor)
    assert vendedor.comision_default_tipo is None
    assert vendedor.comision_default_valor is None


async def test_rf083_usuario_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.put(
        _url(uuid.uuid4()),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": "10"},
    )

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf083_no_modifica_a_otros_usuarios(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(sesion)
    otro = await _vendedor(sesion)

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": "10"},
    )

    assert r.status_code == 200
    await sesion.refresh(otro)
    assert otro.comision_default_tipo is None
    assert otro.comision_default_valor is None


async def test_rf152_updated_by_queda_con_quien_hizo_el_cambio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    vendedor = await _vendedor(sesion)

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "importe", "comision_default_valor": "1000"},
    )

    assert r.status_code == 200
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(vendedor)
    assert vendedor.updated_by == c.usuario.id  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"comision_default_tipo": "porcentaje", "comision_default_valor": "100.01"},
        {"comision_default_tipo": "porcentaje", "comision_default_valor": "-0.01"},
        {"comision_default_tipo": "importe", "comision_default_valor": "-1"},
        {"comision_default_tipo": "importe", "comision_default_valor": None},
        {"comision_default_tipo": None, "comision_default_valor": "10"},
        {"comision_default_tipo": "importe", "comision_default_valor": "10.123"},
    ],
)
async def test_rf084_valor_invalido_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(
        sesion,
        comision_default_tipo=TipoComision("importe"),
        comision_default_valor=Decimal("7000.00"),
    )

    r = await c.put(_url(vendedor.id), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(vendedor)  # el valor previo queda intacto
    assert vendedor.comision_default_tipo == TipoComision("importe")
    assert vendedor.comision_default_valor == Decimal("7000.00")


async def test_rf085_no_cambia_viajes_existentes(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    vendedor = await _vendedor(
        sesion,
        comision_default_tipo=TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )
    cliente = await crear(sesion, ClienteFactory)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=vendedor.id,
        vendedor_id=vendedor.id,
        comision_tipo=TipoComision("porcentaje"),
        comision_vendedor=Decimal("10.00"),
    )

    r = await c.put(
        _url(vendedor.id),
        json={"comision_default_tipo": "importe", "comision_default_valor": "25000.00"},
    )

    assert r.status_code == 200  # el cambio se aplicó...
    await sesion.refresh(viaje)  # ...y el viaje existente conserva su comisión
    assert viaje.comision_tipo == TipoComision("porcentaje")
    assert viaje.comision_vendedor == Decimal("10.00")


async def test_rf083_usuario_inactivo_puede_tener_comision(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """CU-13, decisión del 22/10/26: también se configura la comisión de un usuario dado de baja."""
    c = await cliente_como("admin")
    baja = await crear(sesion, UsuarioFactory, rol=RolUsuario("empleado"), activo=False)

    r = await c.put(
        _url(baja.id),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": "7.50"},
    )

    assert r.status_code == 200
    assert Decimal(r.json()["comision_default_valor"]) == Decimal("7.50")
    await sesion.refresh(baja)
    assert baja.activo is False
    assert baja.comision_default_tipo == TipoComision("porcentaje")
    assert baja.comision_default_valor == Decimal("7.50")


async def test_rf083_admin_fija_su_propia_comision(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    admin = c.usuario  # type: ignore[attr-defined]

    r = await c.put(
        _url(admin.id),
        json={"comision_default_tipo": "importe", "comision_default_valor": "3000.00"},
    )

    assert r.status_code == 200
    await sesion.refresh(admin)
    assert admin.comision_default_tipo == TipoComision("importe")
    assert admin.comision_default_valor == Decimal("3000.00")


async def test_rf083_admin_fija_la_comision_de_la_duena(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    duena = await crear(sesion, UsuarioFactory, rol=RolUsuario("dueno"), activo=True)

    r = await c.put(
        _url(duena.id),
        json={"comision_default_tipo": "porcentaje", "comision_default_valor": "5"},
    )

    assert r.status_code == 200
    await sesion.refresh(duena)
    assert duena.comision_default_tipo == TipoComision("porcentaje")
    assert duena.comision_default_valor == Decimal("5.00")
