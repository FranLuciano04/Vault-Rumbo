"""T-175: ganar la oportunidad con la cotización que eligió el cliente (CU-05, CU-06, CU-07;
RF-016, RF-025; RN-08; DEC-0028 punto 1).

Supuestos que el ticket y la DEC no fijan del todo y que fijan estos tests:

- El error por una cotización que no admite la aceptación (de otra oportunidad, vencida, ya
  rechazada, o con otra aceptada en la oportunidad) es 409 o 422, y no cambia nada.
- Una cotización en `borrador` se puede elegir (DEC-0028 1.4): queda `aceptada`.
- Al ganar, las demás `enviada` pasan a `rechazada` y los `borrador` quedan como están (1.5).
"""

from collections.abc import Awaitable, Callable
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Cotizacion,
    EstadoAlerta,
    EstadoCotizacion,
    EstadoOportunidad,
    Moneda,
    Oportunidad,
    TipoAlerta,
)
from tests.fabricas import (
    AlertaFactory,
    ClienteFactory,
    CotizacionFactory,
    DestinoFactory,
    OportunidadFactory,
    crear,
)

FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
E = EstadoOportunidad
C = EstadoCotizacion


async def _op(sesion: AsyncSession, responsable_id: UUID, estado: E = E.cotizada) -> Oportunidad:
    cliente = await crear(sesion, ClienteFactory)
    return await crear(
        sesion,
        OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=estado,
    )


async def _cot(
    sesion: AsyncSession,
    op: Oportunidad,
    estado: C = C.enviada,
    *,
    dias: int = 30,
    fecha: date | None = None,
    moneda: Moneda = Moneda.ARS,
) -> Cotizacion:
    extra: dict[str, Any] = {} if fecha is None else {"fecha": fecha}
    return await crear(
        sesion,
        CotizacionFactory,
        oportunidad_id=op.id,
        estado=estado,
        validez_hasta=hoy() + timedelta(days=dias),
        moneda=moneda,
        **extra,
    )


def _ganar(op: Oportunidad | UUID) -> str:
    return f"/api/oportunidades/{op.id if isinstance(op, Oportunidad) else op}/ganar"


async def test_rf016_ganar_con_la_cotizacion_elegida(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = c.usuario.id  # type: ignore[attr-defined]
    op = await _op(sesion, yo)
    elegida = await _cot(sesion, op, fecha=date(2026, 10, 1))
    otra_enviada = await _cot(sesion, op, fecha=date(2026, 10, 5))
    borrador = await _cot(sesion, op, C.borrador, fecha=date(2026, 10, 8))
    insistencia = await crear(
        sesion,
        AlertaFactory,
        propietario_id=yo,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
    )

    r = await c.post(_ganar(op), json={"cotizacion_id": str(elegida.id)})

    assert r.status_code == 200
    assert r.json()["estado"] == "ganada"
    for obj in (op, elegida, otra_enviada, borrador, insistencia):
        await sesion.refresh(obj)
    assert op.estado is E.ganada
    assert elegida.estado is C.aceptada
    assert otra_enviada.estado is C.rechazada  # DEC-0028 1.5
    assert borrador.estado is C.borrador
    assert insistencia.estado is EstadoAlerta.resuelta  # RN-08


async def test_rf016_ganar_eligiendo_un_borrador_lo_acepta(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    borrador = await _cot(sesion, op, C.borrador)

    r = await c.post(_ganar(op), json={"cotizacion_id": str(borrador.id)})

    assert r.status_code == 200
    await sesion.refresh(op)
    await sesion.refresh(borrador)
    assert op.estado is E.ganada
    assert borrador.estado is C.aceptada  # DEC-0028 1.4


async def test_rf016_ganar_con_cotizacion_de_otra_oportunidad_es_error(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = c.usuario.id  # type: ignore[attr-defined]
    op = await _op(sesion, yo)
    propia = await _cot(sesion, op)
    otra_op = await _op(sesion, yo)
    ajena = await _cot(sesion, otra_op)

    r = await c.post(_ganar(op), json={"cotizacion_id": str(ajena.id)})

    assert r.status_code in (409, 422)
    for obj in (op, propia, otra_op, ajena):
        await sesion.refresh(obj)
    assert op.estado is E.cotizada
    assert propia.estado is C.enviada
    assert otra_op.estado is E.cotizada
    assert ajena.estado is C.enviada


async def test_rf016_ganar_con_cotizacion_vencida_es_409(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    vencida_por_fecha = await _cot(sesion, op, C.enviada, dias=-1)
    vencida_marcada = await _cot(sesion, op, C.vencida, dias=-10)
    rechazada = await _cot(sesion, op, C.rechazada)

    for cot in (vencida_por_fecha, vencida_marcada, rechazada):
        r = await c.post(_ganar(op), json={"cotizacion_id": str(cot.id)})
        assert r.status_code == 409

    await sesion.refresh(op)
    await sesion.refresh(vencida_por_fecha)
    assert op.estado is E.cotizada
    assert vencida_por_fecha.estado is C.enviada


async def test_rf016_ganar_con_cotizacion_inexistente_es_error(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_ganar(op), json={"cotizacion_id": "00000000-0000-4000-8000-000000000000"})

    assert r.status_code in (404, 409, 422)
    await sesion.refresh(op)
    assert op.estado is E.cotizada


async def test_rf025_aceptar_una_version_que_no_es_la_ultima(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = c.usuario.id  # type: ignore[attr-defined]
    op = await _op(sesion, yo)
    vieja = await _cot(sesion, op, fecha=date(2026, 10, 1))
    ultima = await _cot(sesion, op, fecha=date(2026, 10, 9))

    # Por «aceptar» de la sección de cotizaciones: la oportunidad queda cotizada.
    r = await c.post(f"/api/cotizaciones/{vieja.id}/aceptar")

    assert r.status_code == 200
    await sesion.refresh(vieja)
    await sesion.refresh(ultima)
    assert vieja.estado is C.aceptada
    assert ultima.estado is C.enviada

    # Y al ganar eligiendo una que no es la última.
    op2 = await _op(sesion, yo)
    vieja2 = await _cot(sesion, op2, fecha=date(2026, 10, 1))
    await _cot(sesion, op2, fecha=date(2026, 10, 9))

    r2 = await c.post(_ganar(op2), json={"cotizacion_id": str(vieja2.id)})

    assert r2.status_code == 200
    await sesion.refresh(vieja2)
    assert vieja2.estado is C.aceptada


async def test_rf025_una_sola_aceptada_por_oportunidad(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    aceptada = await _cot(sesion, op, C.aceptada)
    otra = await _cot(sesion, op, C.enviada)

    por_aceptar = await c.post(f"/api/cotizaciones/{otra.id}/aceptar")
    por_ganar = await c.post(_ganar(op), json={"cotizacion_id": str(otra.id)})

    assert por_aceptar.status_code == 409
    assert por_ganar.status_code in (409, 422)
    for obj in (op, aceptada, otra):
        await sesion.refresh(obj)
    assert op.estado is E.cotizada
    assert aceptada.estado is C.aceptada
    assert otra.estado is C.enviada


async def test_rf016_ganar_sin_cotizacion_es_venta_directa(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = c.usuario.id  # type: ignore[attr-defined]
    op = await _op(sesion, yo, E.en_gestion)
    enviada = await _cot(sesion, op, C.enviada)

    sin_cuerpo = await c.post(_ganar(op))

    assert sin_cuerpo.status_code == 200
    await sesion.refresh(op)
    await sesion.refresh(enviada)
    assert op.estado is E.ganada
    assert enviada.estado is C.enviada  # ninguna se acepta ni se rechaza

    op2 = await _op(sesion, yo, E.nueva)
    con_nulo = await c.post(_ganar(op2), json={"cotizacion_id": None})
    assert con_nulo.status_code == 200
    await sesion.refresh(op2)
    assert op2.estado is E.ganada


async def test_cu07_reserva_de_ganada_con_aceptada_usa_su_moneda(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    elegida = await _cot(sesion, op, moneda=Moneda.USD)
    destino = await crear(sesion, DestinoFactory)
    op_id = op.id
    ganada = await c.post(_ganar(op), json={"cotizacion_id": str(elegida.id)})
    assert ganada.status_code == 200
    await sesion.refresh(elegida)
    assert elegida.estado is C.aceptada

    r = await c.post(
        f"/api/oportunidades/{op_id}/confirmar-reserva",
        json={
            "destino_id": str(destino.id),
            "fecha_salida": "2027-02-10",
            "fecha_regreso": "2027-02-20",
            "categoria": "individual",
            "economia": {"precio_venta": "1000000.00", "costo": "800000.00"},
            "plan_de_pagos": {
                "pagos": [
                    {"monto": "400000.00", "tipo": "sena", "vencimiento": "2026-12-01"},
                    {"monto": "600000.00", "tipo": "saldo", "vencimiento": "2027-01-15"},
                ]
            },
        },
    )

    assert r.status_code == 201
    assert r.json()["moneda"] == "USD"
