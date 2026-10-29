"""T-090: PUT /viajes/{id}/economia (CU-10; RF-055 a RF-059; RN-01; DEC-0005, DEC-0008).

El contrato (roles, forma del cuerpo) ya lo cubre `test_contrato_m6.py`; acá se fija el
comportamiento. Las advertencias viajan en `advertencias` del cuerpo (`EconomiaRegistrada`).
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"
CUERPO = {"precio_venta": "1000000.00", "costo": "800000.00"}


def _url(viaje_id: uuid.UUID) -> str:
    return f"/api/viajes/{viaje_id}/economia"


def _advertencias(r: Response) -> set[str]:
    return set(r.json()["advertencias"])


async def _viaje(sesion: AsyncSession, responsable_id: uuid.UUID, **campos: Any) -> m.Viaje:
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        **campos,
    )


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def test_rf055_calcula_ganancia_y_margen(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(viaje.id)
    assert Decimal(cuerpo["precio_venta"]) == Decimal("1000000.00")
    assert Decimal(cuerpo["costo"]) == Decimal("800000.00")
    assert Decimal(cuerpo["ganancia"]) == Decimal("200000.00")
    assert Decimal(cuerpo["margen"]) == Decimal("0.2000")
    await sesion.refresh(viaje)
    assert viaje.costo == Decimal("800000.00")


async def test_rn01_precarga_la_comision_del_vendedor(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    vendedor = await f.crear(
        sesion,
        f.UsuarioFactory,
        rol=m.RolUsuario("empleado"),
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("12.50"),
    )
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json={**CUERPO, "vendedor_id": str(vendedor.id)})

    assert r.status_code == 200
    assert r.json()["vendedor_id"] == str(vendedor.id)
    assert r.json()["comision_tipo"] == "porcentaje"
    assert Decimal(r.json()["comision_vendedor"]) == Decimal("12.50")


async def test_rf056_override_de_la_comision(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    vendedor = await f.crear(
        sesion,
        f.UsuarioFactory,
        rol=m.RolUsuario("empleado"),
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(
        _url(viaje.id),
        json={
            **CUERPO,
            "vendedor_id": str(vendedor.id),
            "comision_tipo": "importe",
            "comision_vendedor": "30000.00",
        },
    )

    assert r.status_code == 200
    assert r.json()["comision_tipo"] == "importe"
    assert Decimal(r.json()["comision_vendedor"]) == Decimal("30000.00")


async def test_rf057_sin_vendedor_comision_en_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 200
    assert r.json()["vendedor_id"] is None
    assert Decimal(r.json()["comision_vendedor"]) == Decimal("0")


async def test_rf058_negativo_guarda_y_advierte(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json={"precio_venta": "500000.00", "costo": "650000.00"})

    assert r.status_code == 200
    assert Decimal(r.json()["ganancia"]) == Decimal("-150000.00")
    assert {"ganancia_negativa", "margen_negativo"} <= _advertencias(r)


async def test_rf058_sin_advertencias_si_la_ganancia_es_positiva(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 200
    assert _advertencias(r) == set()


async def test_rf059_cambio_de_precio_indica_el_rebalanceo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), precio_venta=Decimal("1000000.00"))
    await f.crear(sesion, f.PagoFactory, viaje_id=viaje.id, monto=Decimal("1000000.00"))

    r = await c.put(_url(viaje.id), json={"precio_venta": "1300000.00", "costo": "800000.00"})

    assert r.status_code == 200
    assert "plan_desbalanceado" in _advertencias(r)
    assert Decimal(r.json()["precio_venta"]) == Decimal("1300000.00")


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_direccion_registra_la_de_otro(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 200


async def test_rf151_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(viaje)
    assert viaje.costo == Decimal("750000.00")  # intacto


async def test_rf151_freelance_registra_el_suyo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 200


async def test_rf151_freelance_viaje_ajeno_404(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf055_viaje_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.put(_url(uuid.uuid4()), json=CUERPO)

    assert r.status_code == 404


async def test_rn01_porcentaje_mayor_a_100_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(
        _url(viaje.id),
        json={**CUERPO, "comision_tipo": "porcentaje", "comision_vendedor": "101.00"},
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


def _campos_estado(estado: str) -> dict[str, Any]:
    if estado != "cancelado":
        return {"estado": m.EstadoViaje(estado)}
    return {
        "estado": m.EstadoViaje("cancelado"),
        "estado_previo": m.EstadoViaje("reservado"),
        "motivo_cancelacion": "El cliente desistió",
        "fecha_cancelacion": date(2026, 11, 5),
    }


@pytest.mark.parametrize("estado", ["cancelado", "finalizado"])
async def test_cu10_viaje_cerrado_409(
    cliente_como: Fabrica, sesion: AsyncSession, estado: str
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), **_campos_estado(estado))

    r = await c.put(_url(viaje.id), json={"precio_venta": "10.00", "costo": "5.00"})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(viaje)
    assert viaje.costo == Decimal("750000.00")


async def test_cu10_viaje_en_curso_200(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado=m.EstadoViaje("en_curso"))

    r = await c.put(_url(viaje.id), json=CUERPO)

    assert r.status_code == 200


async def test_rf058_margen_extremo_200_con_advertencias(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json={"precio_venta": "1.00", "costo": "5000.00"})

    assert r.status_code == 200
    assert Decimal(r.json()["ganancia"]) == Decimal("-4999.00")
    assert Decimal(r.json()["margen"]) == Decimal("-4999.0000")
    assert {"ganancia_negativa", "margen_negativo"} <= _advertencias(r)


async def test_rn01_freelance_ignora_la_comision_enviada(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    c.usuario.comision_default_tipo = m.TipoComision("porcentaje")  # type: ignore[attr-defined]
    c.usuario.comision_default_valor = Decimal("7.50")  # type: ignore[attr-defined]
    await sesion.flush()
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(
        _url(viaje.id),
        json={
            **CUERPO,
            "vendedor_id": str(_yo(c)),
            "comision_tipo": "importe",
            "comision_vendedor": "99999.00",
        },
    )

    assert r.status_code == 200
    assert r.json()["comision_tipo"] == "porcentaje"
    assert Decimal(r.json()["comision_vendedor"]) == Decimal("7.50")


async def test_cu10_operador_de_baja_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    operador = await f.crear(sesion, f.OperadorFactory, activo=False)
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json={**CUERPO, "operador_id": str(operador.id)})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf056_tipo_sin_valor_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    vendedor = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(
        _url(viaje.id),
        json={**CUERPO, "vendedor_id": str(vendedor.id), "comision_tipo": "importe"},
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
