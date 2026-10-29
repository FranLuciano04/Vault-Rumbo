"""T-094: POST /pagos/{id}/cobrar (CU-12; RF-038, RF-067 a RF-069, RF-071, RF-072).

El contrato (roles, forma del cuerpo) ya lo cubre `test_contrato_m6.py`; acá se fija el
comportamiento. Supuestos que fijan estos tests y que el ticket no dice de forma explícita:

- Respuesta: el `Pago` ya cobrado (200), con forma de pago, moneda, tipo de cambio,
  `monto_cobrado` y `fecha_cobro`.
- `monto_cobrado` = `monto` si `moneda_pago` es la del viaje; si difiere, `monto x tipo_cambio`
  (modelo de `Pago`, DEC-0013). Con la misma moneda `tipo_cambio` queda en null aunque se envíe.
- "Importe completo" (RF-072): el cobro no admite un monto; el servidor cobra el `monto`
  planificado entero. Un cuerpo con `monto_cobrado` no puede dejar un cobro parcial.
- La API todavía no expone el saldo (`GET /viajes/{id}` es un stub): el saldo y el porcentaje se
  verifican con `calculos` sobre los pagos guardados y el estado del viaje en la base.
- Solo se cobra un pago `pendiente` o `vencido`; `pagado` o `anulado` responde 409.
- La alerta del pago pasa a `resuelta`.
- Un viaje cancelado no admite cobros (409).
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from decimal import Decimal
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from rumbo.negocio import calculos
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"
PRECIO = Decimal("1000000.00")
COBRO: dict[str, Any] = {
    "fecha_cobro": "2026-11-20",
    "forma_pago": "transferencia",
    "moneda_pago": "ARS",
}


def _url(pago_id: uuid.UUID) -> str:
    return f"/api/pagos/{pago_id}/cobrar"


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
        **{"estado": m.EstadoViaje.reservado, **campos},
    )


async def _pago(sesion: AsyncSession, viaje_id: uuid.UUID, monto: str, **campos: Any) -> m.Pago:
    return await f.crear(sesion, f.PagoFactory, viaje_id=viaje_id, monto=Decimal(monto), **campos)


async def _alerta(sesion: AsyncSession, dueno_id: uuid.UUID, pago_id: uuid.UUID) -> m.Alerta:
    return await f.crear(
        sesion,
        f.AlertaFactory,
        propietario_id=dueno_id,
        pago_id=pago_id,
        tipo=m.TipoAlerta.pago,
        fecha=date(2026, 11, 1),
    )


async def _pagos_de(sesion: AsyncSession, viaje_id: uuid.UUID) -> list[m.Pago]:
    sesion.expire_all()
    consulta = select(m.Pago).where(m.Pago.viaje_id == viaje_id)
    return list((await sesion.scalars(consulta)).all())


async def test_rf067_cobrar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00")
    await _pago(sesion, viaje.id, "700000.00", tipo=m.TipoPago.saldo)
    alerta = await _alerta(sesion, _yo(c), pago.id)

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 200
    assert r.json()["id"] == str(pago.id)
    assert r.json()["estado"] == "pagado"
    assert r.json()["forma_pago"] == "transferencia"
    assert r.json()["moneda_pago"] == "ARS"
    assert r.json()["fecha_cobro"] == "2026-11-20"
    assert Decimal(r.json()["monto_cobrado"]) == Decimal("300000.00")
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pagado
    assert pago.fecha_cobro == date(2026, 11, 20)
    assert pago.monto_cobrado == Decimal("300000.00")
    await sesion.refresh(alerta)
    assert alerta.estado == m.EstadoAlerta.resuelta  # CU-12 paso 4


async def test_rf067_pago_vencido_tambien_se_cobra(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00", estado=m.EstadoPago.vencido)
    alerta = await _alerta(sesion, _yo(c), pago.id)

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 200
    assert r.json()["estado"] == "pagado"
    await sesion.refresh(alerta)
    assert alerta.estado == m.EstadoAlerta.resuelta  # A1


async def test_rf068_otra_moneda(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), moneda=m.Moneda.USD)
    pago = await _pago(sesion, viaje.id, "1000.00")

    r = await c.post(
        _url(pago.id), json={**COBRO, "moneda_pago": "ARS", "tipo_cambio": "1200.5000"}
    )

    assert r.status_code == 200
    assert r.json()["moneda_pago"] == "ARS"
    assert Decimal(r.json()["tipo_cambio"]) == Decimal("1200.5")
    assert Decimal(r.json()["monto_cobrado"]) == Decimal("1200500.00")  # 1000 USD x 1200,50
    await sesion.refresh(pago)
    assert pago.tipo_cambio == Decimal("1200.5")
    assert pago.monto_cobrado == Decimal("1200500.00")
    assert pago.monto == Decimal("1000.00")  # el plan sigue en la moneda del viaje


async def test_rf068_otra_moneda_sin_tipo_de_cambio_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), moneda=m.Moneda.USD)
    pago = await _pago(sesion, viaje.id, "1000.00")

    r = await c.post(_url(pago.id), json={**COBRO, "moneda_pago": "ARS"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente  # no se cobró nada


async def test_rf068_misma_moneda_no_guarda_tipo_de_cambio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00")

    r = await c.post(_url(pago.id), json={**COBRO, "tipo_cambio": "1200.0000"})

    assert r.status_code == 200
    assert r.json()["tipo_cambio"] is None
    assert Decimal(r.json()["monto_cobrado"]) == Decimal("300000.00")


async def test_rf071_forma_de_pago_obligatoria(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00")
    sin_forma = {k: v for k, v in COBRO.items() if k != "forma_pago"}

    r = await c.post(_url(pago.id), json=sin_forma)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente
    assert pago.forma_pago is None


async def test_rf072_cobro_integro(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00")
    otro = await _pago(sesion, viaje.id, "200000.00", tipo=m.TipoPago.cuota)
    await _pago(sesion, viaje.id, "500000.00", tipo=m.TipoPago.saldo)

    # intentar un cobro parcial: el importe lo fija el servidor, siempre el monto completo
    r = await c.post(_url(pago.id), json={**COBRO, "monto_cobrado": "100000.00"})

    assert r.status_code in (200, 422)
    await sesion.refresh(pago)
    if r.status_code == 200:
        assert pago.monto_cobrado == pago.monto == Decimal("300000.00")
    else:
        assert pago.estado == m.EstadoPago.pendiente
    # el camino sin cuerpo parcial siempre cobra todo
    ok = await c.post(_url(otro.id), json=COBRO)
    assert ok.status_code == 200
    assert Decimal(ok.json()["monto_cobrado"]) == Decimal("200000.00")


async def test_rf038_primer_cobro_pasa_a_vendido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00")
    await _pago(sesion, viaje.id, "700000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 200
    await sesion.refresh(viaje)
    assert viaje.estado == m.EstadoViaje.vendido  # A0


async def test_rf038_segundo_cobro_con_saldo_no_cambia_el_estado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado=m.EstadoViaje.vendido)
    await _pago(
        sesion, viaje.id, "300000.00", estado=m.EstadoPago.pagado, forma_pago=m.FormaPago.efectivo,
        moneda_pago=m.Moneda.ARS, monto_cobrado=Decimal("300000.00"), fecha_cobro=date(2026, 11, 1),
    )  # fmt: skip
    cuota = await _pago(sesion, viaje.id, "400000.00", tipo=m.TipoPago.cuota)
    await _pago(sesion, viaje.id, "300000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_url(cuota.id), json=COBRO)

    assert r.status_code == 200
    await sesion.refresh(viaje)
    assert viaje.estado == m.EstadoViaje.vendido


async def test_rf038_saldo_cero_pasa_a_confirmado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado=m.EstadoViaje.vendido)
    await _pago(
        sesion, viaje.id, "300000.00", estado=m.EstadoPago.pagado, forma_pago=m.FormaPago.efectivo,
        moneda_pago=m.Moneda.ARS, monto_cobrado=Decimal("300000.00"), fecha_cobro=date(2026, 11, 1),
    )  # fmt: skip
    saldo = await _pago(sesion, viaje.id, "700000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_url(saldo.id), json=COBRO)

    assert r.status_code == 200
    await sesion.refresh(viaje)
    assert viaje.estado == m.EstadoViaje.confirmado  # A2


async def test_rf038_pago_unico_reservado_pasa_a_confirmado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    unico = await _pago(sesion, viaje.id, "1000000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_url(unico.id), json=COBRO)

    assert r.status_code == 200
    await sesion.refresh(viaje)
    assert viaje.estado == m.EstadoViaje.confirmado  # A0 + A2 en la misma operación


async def test_rf069_saldo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    sena = await _pago(sesion, viaje.id, "250000.00")
    await _pago(sesion, viaje.id, "750000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_url(sena.id), json=COBRO)

    assert r.status_code == 200
    pagos = await _pagos_de(sesion, viaje.id)
    assert calculos.saldo_pendiente(pagos) == Decimal("750000.00")
    assert calculos.porcentaje_pagado(PRECIO, pagos) == Decimal("0.2500")


async def test_rf069_saldo_en_otra_moneda_se_calcula_sobre_el_plan(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), moneda=m.Moneda.USD)
    sena = await _pago(sesion, viaje.id, "250000.00")
    await _pago(sesion, viaje.id, "750000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_url(sena.id), json={**COBRO, "tipo_cambio": "1000.0000"})

    assert r.status_code == 200
    pagos = await _pagos_de(sesion, viaje.id)
    assert calculos.saldo_pendiente(pagos) == Decimal("750000.00")  # sobre el `monto` planificado
    assert calculos.porcentaje_pagado(PRECIO, pagos) == Decimal("0.2500")


async def test_cu10_a4_plan_descalzado_queda_vendido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(
        sesion, viaje.id, "300000.00", estado=m.EstadoPago.pagado, forma_pago=m.FormaPago.efectivo,
        moneda_pago=m.Moneda.ARS, monto_cobrado=Decimal("300000.00"), fecha_cobro=date(2026, 11, 1),
    )  # fmt: skip
    ultimo = await _pago(sesion, viaje.id, "500000.00", tipo=m.TipoPago.saldo)  # suma 800.000

    r = await c.post(_url(ultimo.id), json=COBRO)

    assert r.status_code == 200
    assert r.json()["estado"] == "pagado"
    await sesion.refresh(viaje)
    assert viaje.estado == m.EstadoViaje.vendido  # no confirma sin rebalancear el plan


async def test_rf068_monto_cobrado_fuera_de_rango_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), moneda=m.Moneda.USD)
    pago = await _pago(sesion, viaje.id, "1000000.00", tipo=m.TipoPago.saldo)

    # 1.000.000 x 9.999.999.999 no entra en numeric(14,2)
    r = await c.post(_url(pago.id), json={**COBRO, "tipo_cambio": "9999999999.0000"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente
    assert pago.monto_cobrado is None


async def test_cu12_pago_ya_cobrado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00")
    await _pago(sesion, viaje.id, "700000.00", tipo=m.TipoPago.saldo)
    assert (await c.post(_url(pago.id), json=COBRO)).status_code == 200

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_cu12_pago_anulado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje.id, "300000.00", estado=m.EstadoPago.anulado)

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.anulado


async def test_cu12_viaje_cancelado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(
        sesion,
        _yo(c),
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.reservado,
        motivo_cancelacion="El cliente desistió",
        fecha_cancelacion=date(2026, 11, 5),
    )
    pago = await _pago(sesion, viaje.id, "300000.00")

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 409
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente


async def test_cu12_pago_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(_url(uuid.uuid4()), json=COBRO)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf151_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago(sesion, viaje.id, "300000.00")

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 403
    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente


async def test_rf151_freelance_viaje_ajeno_404(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago(sesion, viaje.id, "300000.00")

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 404


async def test_rf151_direccion_cobra_el_pago_de_otro(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    pago = await _pago(sesion, viaje.id, "300000.00")

    r = await c.post(_url(pago.id), json=COBRO)

    assert r.status_code == 200
