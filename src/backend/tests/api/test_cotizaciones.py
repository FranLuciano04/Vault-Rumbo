"""T-066: emitir cotizaciones versionadas con su vigencia (CU-06, RF-021, RF-022, RF-024;
EST-Cotización, EST-Oportunidad T3)."""

import calendar
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Configuracion,
    Cotizacion,
    EstadoCotizacion,
    EstadoOportunidad,
    MotivoPerdida,
    Oportunidad,
)
from tests.fabricas import ClienteFactory, CotizacionFactory, OportunidadFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
E = EstadoOportunidad

CUERPO: dict[str, Any] = {
    "moneda": "USD",
    "items": [
        {"concepto": "Aéreo", "precio": "1200.50"},
        {"concepto": "Alojamiento", "precio": "800.25"},
    ],
}


async def _op(sesion: AsyncSession, responsable_id: UUID, estado: E = E.nueva) -> Oportunidad:
    campos: dict[str, Any] = {}
    if estado is E.perdida:
        campos["motivo_perdida"] = MotivoPerdida.precio
    cliente = await crear(sesion, ClienteFactory)
    return await crear(
        sesion,
        OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=estado,
        **campos,
    )


def _url(op: Oportunidad | UUID) -> str:
    id_ = op.id if isinstance(op, Oportunidad) else op
    return f"/api/oportunidades/{id_}/cotizaciones"


def _mas_meses(base: date, meses: int) -> date:
    indice = base.month - 1 + meses
    anio, mes = base.year + indice // 12, indice % 12 + 1
    return date(anio, mes, min(base.day, calendar.monthrange(anio, mes)[1]))


async def _fijar_vigencia(sesion: AsyncSession, meses: int) -> None:
    fila = await sesion.get(Configuracion, 1)
    assert fila is not None
    fila.vigencia_cotizacion_meses = meses
    await sesion.flush()


async def _de(sesion: AsyncSession, op: Oportunidad) -> list[Cotizacion]:
    resultado = await sesion.execute(select(Cotizacion).where(Cotizacion.oportunidad_id == op.id))
    return list(resultado.scalars())


# ---------- emitir (T1, RF-021) ----------


async def test_rf021_emitir(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["oportunidad_id"] == str(op.id)
    assert cuerpo["estado"] == "borrador"
    assert cuerpo["moneda"] == "USD"
    assert cuerpo["fecha"] == hoy().isoformat()
    assert Decimal(cuerpo["total"]) == Decimal("2000.75")
    assert [Decimal(i["precio"]) for i in cuerpo["items"]] == [
        Decimal("1200.50"),
        Decimal("800.25"),
    ]
    guardadas = await _de(sesion, op)
    assert len(guardadas) == 1
    assert guardadas[0].id == UUID(cuerpo["id"])
    assert guardadas[0].estado is EstadoCotizacion.borrador
    assert guardadas[0].total == Decimal("2000.75")
    assert isinstance(guardadas[0].total, Decimal)


async def test_rf021_total_decimal_sin_error_de_flotante(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    cuerpo = {
        "moneda": "ARS",
        "items": [{"concepto": "A", "precio": "0.10"}, {"concepto": "B", "precio": "0.20"}],
    }

    r = await c.post(_url(op), json=cuerpo)

    assert r.status_code == 201
    assert Decimal(r.json()["total"]) == Decimal("0.30")


@pytest.mark.parametrize("origen", [E.nueva, E.en_gestion])
async def test_rf021_emitir_no_cambia_el_estado_de_la_oportunidad(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    await sesion.refresh(op)
    assert op.estado is origen  # pasa a cotizada al marcar enviada (T-067), no al emitir


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"moneda": "USD", "items": []},
        {"moneda": "EUR", "items": [{"concepto": "A", "precio": "1.00"}]},
        {"items": [{"concepto": "A", "precio": "1.00"}]},
        {"moneda": "ARS", "items": [{"concepto": "", "precio": "1.00"}]},
        {"moneda": "ARS", "items": [{"concepto": "A", "precio": "-5.00"}]},
    ],
)
async def test_rf021_cuerpo_invalido_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _de(sesion, op) == []
    await sesion.refresh(op)
    assert op.estado is E.nueva


async def test_rf021_total_que_desborda_la_columna_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """Cada precio entra en Numeric(14, 2), pero la suma no: 422, no un 500 de la base."""
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    cuerpo = {
        "moneda": "USD",
        "items": [
            {"concepto": "A", "precio": "999999999999.99"},
            {"concepto": "B", "precio": "999999999999.99"},
        ],
    }

    r = await c.post(_url(op), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _de(sesion, op) == []


async def test_rf021_oportunidad_inexistente_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_url(uuid4()), json=CUERPO)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf151_empleado_no_responsable_403(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await cliente_como("empleado")
    op = await _op(sesion, otro.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 403
    assert await _de(sesion, op) == []
    await sesion.refresh(op)
    assert op.estado is E.nueva


async def test_rf151_freelance_ajena_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await cliente_como("empleado")
    op = await _op(sesion, otro.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 404
    assert await _de(sesion, op) == []


async def test_rf021_sin_sesion_401(cliente_sin_sesion: AsyncClient) -> None:
    r = await cliente_sin_sesion.post(_url(uuid4()), json=CUERPO)

    assert r.status_code == 401


# ---------- vigencia (RF-022) ----------


@pytest.mark.parametrize("meses", [1, 3, 12])
async def test_rf022_vigencia_por_parametro(
    cliente_como: FabricaCliente, sesion: AsyncSession, meses: int
) -> None:
    await _fijar_vigencia(sesion, meses)
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    assert r.json()["validez_hasta"] == _mas_meses(hoy(), meses).isoformat()
    guardadas = await _de(sesion, op)
    assert guardadas[0].validez_hasta == _mas_meses(guardadas[0].fecha, meses)


async def test_rf022_cambiar_el_parametro_no_toca_las_ya_emitidas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await _fijar_vigencia(sesion, 1)
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    primera = await c.post(_url(op), json=CUERPO)
    await _fijar_vigencia(sesion, 6)

    segunda = await c.post(_url(op), json=CUERPO)

    assert primera.json()["validez_hasta"] == _mas_meses(hoy(), 1).isoformat()
    assert segunda.json()["validez_hasta"] == _mas_meses(hoy(), 6).isoformat()
    primera_en_bd = await sesion.get(Cotizacion, UUID(primera.json()["id"]))
    assert primera_en_bd is not None
    await sesion.refresh(primera_en_bd)
    assert primera_en_bd.validez_hasta == _mas_meses(hoy(), 1)


# ---------- nueva versión (A1, RF-024) ----------


async def test_rf024_nueva_version(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    primera = await c.post(_url(op), json=CUERPO)
    segunda = await c.post(
        _url(op), json={"moneda": "ARS", "items": [{"concepto": "Paquete", "precio": "99.00"}]}
    )

    assert primera.status_code == 201
    assert segunda.status_code == 201
    assert primera.json()["id"] != segunda.json()["id"]
    assert segunda.json()["estado"] == "borrador"
    guardadas = await _de(sesion, op)
    por_id = {str(g.id): g for g in guardadas}
    assert set(por_id) == {primera.json()["id"], segunda.json()["id"]}
    assert por_id[segunda.json()["id"]].moneda.value == "ARS"
    assert por_id[segunda.json()["id"]].total == Decimal("99.00")
    assert por_id[primera.json()["id"]].total == Decimal("2000.75")


async def test_rf024_las_anteriores_se_conservan_intactas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """Versionar no es una transición (EST-Cotización): la anterior queda como estaba, con sus
    ítems y su estado, también si ya había sido enviada."""
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, E.cotizada)  # type: ignore[attr-defined]
    enviada = await crear(
        sesion, CotizacionFactory, oportunidad_id=op.id, estado=EstadoCotizacion.enviada
    )
    items_antes = list(enviada.items)

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    await sesion.refresh(enviada)
    assert enviada.estado is EstadoCotizacion.enviada
    assert enviada.items == items_antes
    assert enviada.total == Decimal("1500000.00")
    assert len(await _de(sesion, op)) == 2


async def test_rf024_la_oportunidad_cotizada_sigue_cotizada(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, E.cotizada)  # type: ignore[attr-defined]
    await c.post(_url(op), json=CUERPO)

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    await sesion.refresh(op)
    assert op.estado is E.cotizada


async def test_rf024_versiones_de_otra_oportunidad_no_se_mezclan(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    uno = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    dos = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    await c.post(_url(uno), json=CUERPO)
    await c.post(_url(uno), json=CUERPO)

    await c.post(_url(dos), json=CUERPO)

    assert len(await _de(sesion, uno)) == 2
    assert len(await _de(sesion, dos)) == 1


# ---------- estado de la oportunidad (EST-Oportunidad T3) ----------


@pytest.mark.parametrize("origen", [E.ganada, E.perdida])
async def test_oportunidad_cerrada_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _de(sesion, op) == []
    await sesion.refresh(op)
    assert op.estado is origen


# ---------- listar las versiones (GET, RF-024) ----------


async def _versiones(
    sesion: AsyncSession, op: Oportunidad, cantidad: int
) -> list[Cotizacion]:
    """Versiones de la más antigua a la más reciente (created_at distinto y creciente)."""
    return [
        await crear(
            sesion,
            CotizacionFactory,
            oportunidad_id=op.id,
            created_at=datetime(2026, 10, 1 + n, 12, 0, tzinfo=UTC),
        )
        for n in range(cantidad)
    ]


async def test_rf024_listar_de_la_mas_reciente_a_la_mas_antigua(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    versiones = await _versiones(sesion, op, 3)

    r = await c.get(_url(op))

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["total"] == 3
    assert cuerpo["pagina"] == 1
    assert cuerpo["por_pagina"] == 20
    assert [i["id"] for i in cuerpo["items"]] == [str(v.id) for v in reversed(versiones)]
    primera = cuerpo["items"][0]
    assert primera["oportunidad_id"] == str(op.id)
    assert primera["estado"] == "borrador"
    assert primera["moneda"] == "ARS"
    assert Decimal(primera["total"]) == Decimal("1500000.00")
    assert primera["validez_hasta"] == "2026-11-01"
    assert primera["items"] == [{"concepto": "Paquete", "precio": "1500000.00"}]


async def test_rf024_listar_incluye_la_version_recien_emitida_primera(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    await _versiones(sesion, op, 2)
    nueva = await c.post(_url(op), json=CUERPO)

    r = await c.get(_url(op))

    assert r.status_code == 200
    assert r.json()["total"] == 3
    assert r.json()["items"][0]["id"] == nueva.json()["id"]


async def test_rf024_listar_sin_versiones_devuelve_pagina_vacia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.get(_url(op))

    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "pagina": 1, "por_pagina": 20}


async def test_rf024_listar_paginado(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    versiones = await _versiones(sesion, op, 5)
    esperado = [str(v.id) for v in reversed(versiones)]

    r = await c.get(_url(op), params={"pagina": 2, "por_pagina": 2})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["total"] == 5
    assert cuerpo["pagina"] == 2
    assert cuerpo["por_pagina"] == 2
    assert [i["id"] for i in cuerpo["items"]] == esperado[2:4]


async def test_rf024_listar_no_mezcla_versiones_de_otra_oportunidad(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    uno = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    dos = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    propias = await _versiones(sesion, uno, 2)
    await _versiones(sesion, dos, 3)

    r = await c.get(_url(uno))

    assert r.status_code == 200
    assert r.json()["total"] == 2
    assert {i["id"] for i in r.json()["items"]} == {str(v.id) for v in propias}


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado"])
async def test_rf024_listar_roles_con_visibilidad_total_ven_las_ajenas(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await cliente_como("empleado")
    op = await _op(sesion, otro.usuario.id)  # type: ignore[attr-defined]
    await _versiones(sesion, op, 2)

    r = await c.get(_url(op))

    assert r.status_code == 200
    assert r.json()["total"] == 2


async def test_rf151_listar_freelance_ve_las_de_su_oportunidad(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    await _versiones(sesion, op, 2)

    r = await c.get(_url(op))

    assert r.status_code == 200
    assert r.json()["total"] == 2


async def test_rf151_listar_freelance_ajena_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await cliente_como("empleado")
    op = await _op(sesion, otro.usuario.id)  # type: ignore[attr-defined]
    await _versiones(sesion, op, 1)

    r = await c.get(_url(op))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf024_listar_oportunidad_inexistente_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get(_url(uuid4()))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "params", [{"pagina": 0}, {"por_pagina": 0}, {"por_pagina": 101}, {"pagina": "x"}]
)
async def test_rf024_listar_paginacion_invalida_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, params: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.get(_url(op), params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf024_listar_sin_sesion_401(cliente_sin_sesion: AsyncClient) -> None:
    r = await cliente_sin_sesion.get(_url(uuid4()))

    assert r.status_code == 401
