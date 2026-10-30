"""T-092: PUT/GET /viajes/{id}/pagos (CU-11; RF-059 a RF-064; DEC-0005).

El contrato (roles, forma del cuerpo) ya lo cubre `test_contrato_m6.py`; acá se fija el
comportamiento. Supuestos que fijan estos tests y que el ticket no dice de forma explícita:

- Respuesta del PUT y del GET: el plan completo del viaje (cobrados incluidos), sin los
  anulados, ordenado por vencimiento.
- La alerta de cada pago es de tipo `pago`, queda en la agenda del responsable del viaje y su
  fecha es un mes antes del vencimiento (CU-11 paso 6).
- Rebalancear reemplaza los pagos no cobrados: los viejos dejan de figurar en el plan y sus
  alertas ya no quedan pendientes. Σ (cobrados + nuevos) debe igualar el precio de venta.
- Un viaje cancelado o finalizado no admite un plan nuevo (409), igual que su economía.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from decimal import Decimal
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import sumar_meses
from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"
PRECIO = Decimal("1000000.00")


def _url(viaje_id: uuid.UUID) -> str:
    return f"/api/viajes/{viaje_id}/pagos"


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _viaje(sesion: AsyncSession, responsable_id: uuid.UUID, **campos: Any) -> m.Viaje:
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        precio_venta=PRECIO,
        **campos,
    )


def _plan(*items: tuple[str, str, str]) -> dict[str, Any]:
    return {
        "pagos": [
            {"monto": monto, "tipo": tipo, "vencimiento": venc} for monto, tipo, venc in items
        ]
    }


PLAN_TRES = _plan(
    ("300000.00", "sena", "2026-12-01"),
    ("400000.00", "cuota", "2027-01-05"),
    ("300000.00", "saldo", "2027-02-05"),
)


async def _pagos_de(sesion: AsyncSession, viaje_id: uuid.UUID) -> list[m.Pago]:
    consulta = select(m.Pago).where(m.Pago.viaje_id == viaje_id)
    return list((await sesion.scalars(consulta)).all())


async def _alertas_de(sesion: AsyncSession, pago_ids: list[uuid.UUID]) -> list[m.Alerta]:
    consulta = select(m.Alerta).where(m.Alerta.pago_id.in_(pago_ids))
    return list((await sesion.scalars(consulta)).all())


async def _pago_cobrado(sesion: AsyncSession, viaje_id: uuid.UUID) -> m.Pago:
    return await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje_id,
        monto=Decimal("300000.00"),
        tipo=m.TipoPago.sena,
        vencimiento=date(2026, 12, 1),
        estado=m.EstadoPago.pagado,
        forma_pago=m.FormaPago.efectivo,
        moneda_pago=m.Moneda.ARS,
        monto_cobrado=Decimal("300000.00"),
        fecha_cobro=date(2026, 11, 20),
    )


async def test_rf060_definir_plan(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 200
    pagos = r.json()
    assert [(p["tipo"], Decimal(p["monto"]), p["vencimiento"]) for p in pagos] == [
        ("sena", Decimal("300000.00"), "2026-12-01"),
        ("cuota", Decimal("400000.00"), "2027-01-05"),
        ("saldo", Decimal("300000.00"), "2027-02-05"),
    ]
    assert all(p["viaje_id"] == str(viaje.id) for p in pagos)
    guardados = await _pagos_de(sesion, viaje.id)
    assert len(guardados) == 3
    assert sum(p.monto for p in guardados) == PRECIO


async def test_rf061_suma_distinta_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    de_menos = _plan(("300000.00", "sena", "2026-12-01"), ("600000.00", "saldo", "2027-02-05"))

    r = await c.put(_url(viaje.id), json=de_menos)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _pagos_de(sesion, viaje.id) == []  # nada se guarda


async def test_rf061_suma_de_mas_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    de_mas = _plan(("300000.00", "sena", "2026-12-01"), ("700000.01", "saldo", "2027-02-05"))

    r = await c.put(_url(viaje.id), json=de_mas)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _pagos_de(sesion, viaje.id) == []


async def test_rf061_monto_cero_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viejo = await f.crear(
        sesion, f.PagoFactory, viaje_id=viaje.id, monto=PRECIO, tipo=m.TipoPago.saldo
    )
    # suma el precio de venta, pero un pago de cero no es un pago
    con_cero = _plan(("1000000.00", "saldo", "2027-01-05"), ("0.00", "cuota", "2027-02-05"))

    r = await c.put(_url(viaje.id), json=con_cero)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(viejo)
    assert viejo.estado == m.EstadoPago.pendiente  # no se anuló nada
    assert [p.id for p in await _pagos_de(sesion, viaje.id)] == [viejo.id]  # ni se guardó


async def test_rf062_pagos_pendientes(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 200
    assert {p["estado"] for p in r.json()} == {"pendiente"}
    assert all(p["monto_cobrado"] is None and p["fecha_cobro"] is None for p in r.json())
    assert {p.estado for p in await _pagos_de(sesion, viaje.id)} == {m.EstadoPago.pendiente}


async def test_rf063_alerta_por_pago(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 200
    ids = [uuid.UUID(p["id"]) for p in r.json()]
    alertas = await _alertas_de(sesion, ids)
    assert sorted(a.pago_id for a in alertas) == sorted(ids)  # una por pago
    por_pago = {a.pago_id: a for a in alertas}
    for p in r.json():
        alerta = por_pago[uuid.UUID(p["id"])]
        assert alerta.tipo == m.TipoAlerta.pago
        assert alerta.estado == m.EstadoAlerta.pendiente
        assert alerta.propietario_id == _yo(c)
        assert alerta.fecha == sumar_meses(date.fromisoformat(p["vencimiento"]), -1)


async def test_rf064_pago_unico(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=_plan(("1000000.00", "saldo", "2027-01-05")))

    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["tipo"] == "saldo"
    assert Decimal(r.json()[0]["monto"]) == PRECIO
    assert len(await _alertas_de(sesion, [uuid.UUID(r.json()[0]["id"])])) == 1


async def test_rf059_rebalancear_respeta_cobrados(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    cobrado = await _pago_cobrado(sesion, viaje.id)
    viejo = await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje.id,
        monto=Decimal("700000.00"),
        tipo=m.TipoPago.saldo,
        vencimiento=date(2027, 1, 5),
    )
    await f.crear(
        sesion,
        f.AlertaFactory,
        propietario_id=_yo(c),
        pago_id=viejo.id,
        tipo=m.TipoAlerta.pago,
        fecha=date(2026, 12, 5),
    )
    # lo no cobrado (700 000) se reparte en dos cuotas nuevas; el cobrado (300 000) no se toca
    nuevo = _plan(("350000.00", "cuota", "2027-01-05"), ("350000.00", "saldo", "2027-02-05"))

    r = await c.put(_url(viaje.id), json=nuevo)

    assert r.status_code == 200
    pagos = r.json()
    assert [p["id"] for p in pagos if p["estado"] == "pagado"] == [str(cobrado.id)]
    assert str(viejo.id) not in [p["id"] for p in pagos]
    pendientes = [p for p in pagos if p["estado"] == "pendiente"]
    assert [Decimal(p["monto"]) for p in pendientes] == [Decimal("350000.00")] * 2
    assert sum(Decimal(p["monto"]) for p in pagos) == PRECIO
    # el cobrado queda exactamente como estaba
    await sesion.refresh(cobrado)
    assert cobrado.estado == m.EstadoPago.pagado
    assert cobrado.monto == Decimal("300000.00")
    assert cobrado.monto_cobrado == Decimal("300000.00")
    # la alerta del pago reemplazado ya no está pendiente; los nuevos tienen la suya
    viejo_id = viejo.id
    sesion.expire_all()
    vivas = [a for a in await _alertas_de(sesion, [viejo_id]) if a.estado.value == "pendiente"]
    assert vivas == []
    assert len(await _alertas_de(sesion, [uuid.UUID(p["id"]) for p in pendientes])) == 2


async def test_rf059_rebalanceo_que_no_cierra_con_los_cobrados_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    await _pago_cobrado(sesion, viaje.id)
    viejo = await f.crear(
        sesion, f.PagoFactory, viaje_id=viaje.id, monto=Decimal("700000.00"), tipo=m.TipoPago.saldo
    )

    # 1 000 000 pendientes + 300 000 ya cobrados = 1 300 000, distinto del precio de venta
    r = await c.put(_url(viaje.id), json=_plan(("1000000.00", "saldo", "2027-01-05")))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(viejo)
    assert viejo.estado == m.EstadoPago.pendiente  # el plan anterior sigue intacto


async def test_rf060_listar_el_checklist(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    for monto, tipo, venc, estado in (
        ("600000.00", m.TipoPago.saldo, date(2027, 1, 5), m.EstadoPago.pendiente),
        ("400000.00", m.TipoPago.sena, date(2026, 12, 1), m.EstadoPago.pendiente),
        ("50000.00", m.TipoPago.cuota, date(2026, 12, 15), m.EstadoPago.anulado),
    ):
        await f.crear(
            sesion,
            f.PagoFactory,
            viaje_id=viaje.id,
            monto=Decimal(monto),
            tipo=tipo,
            vencimiento=venc,
            estado=estado,
        )

    r = await c.get(_url(viaje.id))

    assert r.status_code == 200
    assert [p["tipo"] for p in r.json()] == ["sena", "saldo"]  # por vencimiento, sin anulados
    assert {p["viaje_id"] for p in r.json()} == {str(viaje.id)}


async def test_rf060_listar_viaje_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(_url(uuid.uuid4()))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf060_definir_viaje_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.put(_url(uuid.uuid4()), json=PLAN_TRES)

    assert r.status_code == 404


async def test_rf151_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _pagos_de(sesion, viaje.id) == []


async def test_rf151_freelance_viaje_ajeno_404(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 404


async def test_rf151_direccion_define_el_plan_de_otro(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 200


async def test_cu11_viaje_cancelado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(
        sesion,
        _yo(c),
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.reservado,
        motivo_cancelacion="El cliente desistió",
        fecha_cancelacion=date(2026, 11, 5),
    )

    r = await c.put(_url(viaje.id), json=PLAN_TRES)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- T-093: reprogramar, anular y dividir un pago (CU-11 A3, A4 y A6; RF-065, RF-066, RF-153) ---
#
# Supuestos que fijan estos tests y que el ticket no dice de forma explícita:
# - Reprogramar mueve la alerta pendiente del pago (fecha = vencimiento nuevo menos un mes); no
#   deja una segunda pendiente.
# - Anular resuelve la alerta (estado `resuelta`); el pago anulado no figura en el GET del plan.
# - Dividir devuelve [original con `monto_ahora`, nuevo con el resto]; el original conserva su
#   vencimiento y su tipo; el nuevo tiene `vencimiento_resto`.
# - Permisos como en el PUT del plan: empleado no responsable 403, freelance ajeno 404.


def _url_pago(pago_id: uuid.UUID, accion: str = "") -> str:
    return f"/api/pagos/{pago_id}{accion}"


async def _pago_con_alerta(
    sesion: AsyncSession,
    viaje: m.Viaje,
    propietario_id: uuid.UUID,
    **campos: Any,
) -> m.Pago:
    datos: dict[str, Any] = {
        "monto": Decimal("400000.00"),
        "tipo": m.TipoPago.cuota,
        "vencimiento": date(2027, 1, 5),
    }
    datos.update(campos)
    pago = await f.crear(sesion, f.PagoFactory, viaje_id=viaje.id, **datos)
    await f.crear(
        sesion,
        f.AlertaFactory,
        propietario_id=propietario_id,
        pago_id=pago.id,
        tipo=m.TipoAlerta.pago,
        fecha=sumar_meses(datos["vencimiento"], -1),
    )
    return pago


async def test_rf065_reprogramar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))
    pago_id = pago.id

    r = await c.patch(_url_pago(pago_id), json={"vencimiento": "2027-03-10"})

    assert r.status_code == 200
    assert r.json()["id"] == str(pago_id)
    assert r.json()["vencimiento"] == "2027-03-10"
    assert Decimal(r.json()["monto"]) == Decimal("400000.00")
    sesion.expire_all()
    alertas = await _alertas_de(sesion, [pago_id])
    pendientes = [a for a in alertas if a.estado == m.EstadoAlerta.pendiente]
    assert len(pendientes) == 1  # la alerta se mueve, no se duplica
    assert pendientes[0].fecha == date(2027, 2, 10)


async def test_rf065_reprogramar_vencido_a_fecha_futura_vuelve_a_pendiente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(
        sesion, viaje, _yo(c), estado=m.EstadoPago.vencido, vencimiento=date(2020, 1, 5)
    )

    r = await c.patch(_url_pago(pago.id), json={"vencimiento": "2999-03-10"})

    assert r.status_code == 200
    assert r.json()["estado"] == "pendiente"
    assert r.json()["vencimiento"] == "2999-03-10"


async def test_rf065_reprogramar_cobrado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    cobrado = await _pago_cobrado(sesion, viaje_id)

    r = await c.patch(_url_pago(cobrado.id), json={"vencimiento": "2027-03-10"})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    sesion.expire_all()
    (guardado,) = await _pagos_de(sesion, viaje_id)
    assert guardado.vencimiento == date(2026, 12, 1)


async def test_rf065_reprogramar_anulado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c), estado=m.EstadoPago.anulado)

    r = await c.patch(_url_pago(pago.id), json={"vencimiento": "2027-03-10"})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf065_reprogramar_pago_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(_url_pago(uuid.uuid4()), json={"vencimiento": "2027-03-10"})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf153_reprogramar_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago_con_alerta(sesion, viaje, otro.id)

    r = await c.patch(_url_pago(pago.id), json={"vencimiento": "2027-03-10"})

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf153_reprogramar_freelance_viaje_ajeno_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago_con_alerta(sesion, viaje, otro.id)

    r = await c.patch(_url_pago(pago.id), json={"vencimiento": "2027-03-10"})

    assert r.status_code == 404


async def test_rf066_anular(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))
    pago_id = pago.id

    r = await c.post(_url_pago(pago_id, "/anular"))

    assert r.status_code == 200
    assert r.json()["id"] == str(pago_id)
    assert r.json()["estado"] == "anulado"
    sesion.expire_all()
    (guardado,) = await _pagos_de(sesion, viaje_id)  # baja lógica: el registro se conserva
    assert guardado.estado == m.EstadoPago.anulado
    (alerta,) = await _alertas_de(sesion, [pago_id])
    assert alerta.estado == m.EstadoAlerta.resuelta
    assert alerta.resuelta_en is not None
    # el plan queda desbalanceado hasta rebalancear: el anulado ya no figura
    plan = await c.get(_url(viaje_id))
    assert plan.status_code == 200
    assert plan.json() == []


async def test_rf066_anular_pago_vencido(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(
        sesion, viaje, _yo(c), estado=m.EstadoPago.vencido, vencimiento=date(2020, 1, 5)
    )

    r = await c.post(_url_pago(pago.id, "/anular"))

    assert r.status_code == 200
    assert r.json()["estado"] == "anulado"


async def test_rf066_anular_cobrado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    cobrado = await _pago_cobrado(sesion, viaje_id)

    r = await c.post(_url_pago(cobrado.id, "/anular"))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    sesion.expire_all()
    (guardado,) = await _pagos_de(sesion, viaje_id)
    assert guardado.estado == m.EstadoPago.pagado


async def test_rf066_anular_ya_anulado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c), estado=m.EstadoPago.anulado)

    r = await c.post(_url_pago(pago.id, "/anular"))

    assert r.status_code == 409


async def test_rf153_anular_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago_con_alerta(sesion, viaje, otro.id)

    r = await c.post(_url_pago(pago.id, "/anular"))

    assert r.status_code == 403


async def test_rf066_anular_pago_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_url_pago(uuid.uuid4(), "/anular"))

    assert r.status_code == 404


async def test_dividir_cuota(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))
    pago_id = pago.id

    r = await c.post(
        _url_pago(pago_id, "/dividir"),
        json={"monto_ahora": "150000.00", "vencimiento_resto": "2027-02-20"},
    )

    assert r.status_code == 201
    ahora, resto = r.json()
    assert ahora["id"] == str(pago_id)
    assert Decimal(ahora["monto"]) == Decimal("150000.00")
    assert ahora["vencimiento"] == "2027-01-05"
    assert Decimal(resto["monto"]) == Decimal("250000.00")
    assert resto["vencimiento"] == "2027-02-20"
    assert resto["id"] != ahora["id"]
    assert resto["viaje_id"] == str(viaje_id)
    assert resto["estado"] == "pendiente"
    resto_id = uuid.UUID(resto["id"])
    yo = _yo(c)
    sesion.expire_all()
    guardados = await _pagos_de(sesion, viaje_id)
    assert len(guardados) == 2
    assert sum(p.monto for p in guardados) == Decimal("400000.00")  # suman lo mismo
    ids = [pago_id, resto_id]
    alertas = await _alertas_de(sesion, ids)
    pendientes = [a for a in alertas if a.estado == m.EstadoAlerta.pendiente]
    assert sorted(a.pago_id for a in pendientes) == sorted(ids)  # una por pago
    por_pago = {a.pago_id: a for a in pendientes}
    assert por_pago[pago_id].fecha == date(2026, 12, 5)
    assert por_pago[resto_id].fecha == date(2027, 1, 20)
    assert por_pago[resto_id].propietario_id == yo
    assert por_pago[resto_id].tipo == m.TipoAlerta.pago


async def test_dividir_cuota_pago_vencido(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(
        sesion, viaje, _yo(c), estado=m.EstadoPago.vencido, vencimiento=date(2020, 1, 5)
    )

    r = await c.post(
        _url_pago(pago.id, "/dividir"),
        json={"monto_ahora": "100000.00", "vencimiento_resto": "2999-02-20"},
    )

    assert r.status_code == 201


async def test_dividir_cuota_monto_ahora_igual_o_mayor_al_pago_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))
    pago_id = pago.id

    for monto in ("400000.00", "400000.01"):
        r = await c.post(
            _url_pago(pago_id, "/dividir"),
            json={"monto_ahora": monto, "vencimiento_resto": "2027-02-20"},
        )

        assert r.status_code == 422
        assert r.headers["content-type"].startswith(PROBLEM_JSON)
    sesion.expire_all()
    assert len(await _pagos_de(sesion, viaje_id)) == 1


async def test_dividir_cuota_monto_ahora_cero_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))

    r = await c.post(
        _url_pago(pago.id, "/dividir"),
        json={"monto_ahora": "0.00", "vencimiento_resto": "2027-02-20"},
    )

    assert r.status_code == 422


async def test_dividir_cuota_cobrada_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    cobrado = await _pago_cobrado(sesion, viaje_id)

    r = await c.post(
        _url_pago(cobrado.id, "/dividir"),
        json={"monto_ahora": "100000.00", "vencimiento_resto": "2027-02-20"},
    )

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    sesion.expire_all()
    assert len(await _pagos_de(sesion, viaje_id)) == 1


async def test_dividir_cuota_anulada_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c), estado=m.EstadoPago.anulado)

    r = await c.post(
        _url_pago(pago.id, "/dividir"),
        json={"monto_ahora": "100000.00", "vencimiento_resto": "2027-02-20"},
    )

    assert r.status_code == 409


async def test_rf153_dividir_freelance_viaje_ajeno_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago_con_alerta(sesion, viaje, otro.id)

    r = await c.post(
        _url_pago(pago.id, "/dividir"),
        json={"monto_ahora": "100000.00", "vencimiento_resto": "2027-02-20"},
    )

    assert r.status_code == 404


async def test_dividir_cuota_resto_con_vencimiento_pasado_queda_vencido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    # mismo vencimiento, mismo estado que al reprogramar: si ya pasó, `vencido`
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))

    r = await c.post(
        _url_pago(pago.id, "/dividir"),
        json={"monto_ahora": "100000.00", "vencimiento_resto": "2020-02-20"},
    )

    assert r.status_code == 201
    ahora, resto = r.json()
    assert ahora["estado"] == "pendiente"
    assert resto["estado"] == "vencido"
    assert resto["vencimiento"] == "2020-02-20"


async def test_rf065_reprogramar_vencimiento_fuera_de_rango_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    # enero del año 1 no tiene un mes antes para la alerta
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))
    pago_id = pago.id

    r = await c.patch(_url_pago(pago_id), json={"vencimiento": "0001-01-15"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    sesion.expire_all()
    (guardado,) = await _pagos_de(sesion, viaje_id)
    assert guardado.vencimiento == date(2027, 1, 5)


async def test_rf065_reprogramar_al_ultimo_dia_admitido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))

    r = await c.patch(_url_pago(pago.id), json={"vencimiento": "9999-12-31"})

    assert r.status_code == 200
    assert r.json()["vencimiento"] == "9999-12-31"


async def test_dividir_cuota_vencimiento_resto_fuera_de_rango_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id
    pago = await _pago_con_alerta(sesion, viaje, _yo(c))
    pago_id = pago.id

    r = await c.post(
        _url_pago(pago_id, "/dividir"),
        json={"monto_ahora": "100000.00", "vencimiento_resto": "0001-01-15"},
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    sesion.expire_all()
    (guardado,) = await _pagos_de(sesion, viaje_id)  # nada se partió
    assert guardado.monto == Decimal("400000.00")


async def test_rf061_vencimiento_fuera_de_rango_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.put(_url(viaje.id), json=_plan(("1000000.00", "saldo", "0001-01-15")))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _pagos_de(sesion, viaje.id) == []
