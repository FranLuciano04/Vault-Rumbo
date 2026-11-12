"""T-177: la cotización guarda hoteles con fechas y la reserva arma el itinerario (CU-06, CU-07,
CU-09, RF-043, RF-106, DEC-0003, DEC-0028 punto 4: un tramo que no entra se omite con advertencia,
la reserva no se rechaza)."""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
SALIDA = date(2027, 2, 10)
REGRESO = date(2027, 2, 20)
PLAN = {"pagos": [{"monto": "400000.00", "tipo": "sena", "vencimiento": "2026-12-01"}]}


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _oportunidad(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    estado: m.EstadoOportunidad = m.EstadoOportunidad.cotizada,
) -> m.Oportunidad:
    cliente = await f.crear(sesion, f.ClienteFactory)
    return await f.crear(
        sesion,
        f.OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=estado,
    )


async def _hotel(sesion: AsyncSession, **campos: Any) -> m.Hotel:
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(sesion, f.HotelFactory, destino_id=destino.id, **campos)


def _item_hotel(hotel: m.Hotel, check_in: str, check_out: str) -> dict[str, Any]:
    return {
        "concepto": "Alojamiento",
        "precio": "100000.00",
        "hotel_id": str(hotel.id),
        "check_in": check_in,
        "check_out": check_out,
    }


async def _confirmar(
    c: AsyncClient, sesion: AsyncSession, items: list[dict[str, Any]] | None
) -> Any:
    """Confirma la reserva de una oportunidad propia; `items=None` es venta directa."""
    destino = await f.crear(sesion, f.DestinoFactory)
    estado = m.EstadoOportunidad.ganada if items is None else m.EstadoOportunidad.cotizada
    oportunidad = await _oportunidad(sesion, _yo(c), estado)
    oportunidad_id = oportunidad.id
    cuerpo: dict[str, Any] = {
        "destino_id": str(destino.id),
        "fecha_salida": SALIDA.isoformat(),
        "fecha_regreso": REGRESO.isoformat(),
        "categoria": "individual",
        "economia": {"precio_venta": "1000000.00", "costo": "800000.00"},
        "plan_de_pagos": PLAN,
    }
    if items is None:
        cuerpo["moneda"] = "ARS"
    else:
        await f.crear(
            sesion,
            f.CotizacionFactory,
            oportunidad_id=oportunidad_id,
            estado=m.EstadoCotizacion.aceptada,
            items=items,
        )
    return await c.post(f"/api/oportunidades/{oportunidad_id}/confirmar-reserva", json=cuerpo)


async def _tramos(sesion: AsyncSession, viaje_id: str) -> list[m.ViajeHotel]:
    sesion.expire_all()
    consulta = select(m.ViajeHotel).where(m.ViajeHotel.viaje_id == uuid.UUID(viaje_id))
    return list((await sesion.scalars(consulta.order_by(m.ViajeHotel.check_in))).all())


# --- RF-106: la cotización guarda los hoteles con sus fechas ---


async def test_rf106_cotizacion_guarda_hoteles_con_fechas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op_id = (await _oportunidad(sesion, _yo(c))).id
    hotel = await _hotel(sesion)
    item = _item_hotel(hotel, "2027-02-10", "2027-02-15")

    r = await c.post(
        f"/api/oportunidades/{op_id}/cotizaciones",
        json={"moneda": "ARS", "items": [{"concepto": "Aéreo", "precio": "50.00"}, item]},
    )

    assert r.status_code == 201
    devuelto = r.json()["items"][1]
    assert devuelto["hotel_id"] == str(hotel.id)
    assert (devuelto["check_in"], devuelto["check_out"]) == ("2027-02-10", "2027-02-15")
    sesion.expire_all()
    guardada = (
        await sesion.scalars(select(m.Cotizacion).where(m.Cotizacion.oportunidad_id == op_id))
    ).one()
    assert guardada.items[1]["hotel_id"] == str(hotel.id)
    assert guardada.items[1]["check_in"] == "2027-02-10"
    assert guardada.items[1]["check_out"] == "2027-02-15"


async def test_rf106_hotel_cerrado_o_fechas_invertidas_es_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op_id = (await _oportunidad(sesion, _yo(c))).id
    abierto = await _hotel(sesion)
    cerrado = await _hotel(sesion, estado=m.EstadoHotel.cerrado)
    casos = {
        "cerrado": _item_hotel(cerrado, "2027-02-10", "2027-02-15"),
        "inexistente": {
            **_item_hotel(abierto, "2027-02-10", "2027-02-15"),
            "hotel_id": str(uuid.uuid4()),
        },
        "invertidas": _item_hotel(abierto, "2027-02-15", "2027-02-10"),
    }

    for nombre, item in casos.items():
        r = await c.post(
            f"/api/oportunidades/{op_id}/cotizaciones", json={"moneda": "ARS", "items": [item]}
        )
        assert r.status_code == 422, nombre
        assert any("items" in e["campo"] for e in r.json()["errores"]), nombre

    sesion.expire_all()
    guardadas = (
        await sesion.scalars(select(m.Cotizacion).where(m.Cotizacion.oportunidad_id == op_id))
    ).all()
    assert list(guardadas) == []


# --- CU-07: la reserva arma el itinerario ---


async def test_cu07_reserva_crea_el_itinerario_de_la_cotizacion(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    h1, h2 = await _hotel(sesion), await _hotel(sesion)
    id1, id2 = h1.id, h2.id
    items = [
        {"concepto": "Aéreo", "precio": "50.00"},
        _item_hotel(h1, "2027-02-10", "2027-02-14"),
        _item_hotel(h2, "2027-02-14", "2027-02-20"),
    ]

    r = await _confirmar(c, sesion, items)

    assert r.status_code == 201
    assert r.json()["advertencias_itinerario"] == []
    tramos = await _tramos(sesion, r.json()["id"])
    assert [t.hotel_id for t in tramos] == [id1, id2]
    assert [t.orden for t in tramos] == [1, 2]
    assert [(t.check_in, t.check_out) for t in tramos] == [
        (date(2027, 2, 10), date(2027, 2, 14)),
        (date(2027, 2, 14), date(2027, 2, 20)),
    ]


async def test_cu07_tramo_fuera_del_viaje(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    dentro, fuera = await _hotel(sesion), await _hotel(sesion)
    dentro_id, fuera_id = dentro.id, fuera.id
    items = [
        _item_hotel(dentro, "2027-02-10", "2027-02-14"),
        _item_hotel(fuera, "2027-02-18", "2027-02-25"),
    ]

    r = await _confirmar(c, sesion, items)

    assert r.status_code == 201  # DEC-0028: no se rechaza la reserva
    assert r.json()["advertencias_itinerario"] == [
        {"hotel_id": str(fuera_id), "motivo": "fuera_de_fechas"}
    ]
    assert [t.hotel_id for t in await _tramos(sesion, r.json()["id"])] == [dentro_id]


async def test_cu07_tramo_superpuesto_se_omite_con_advertencia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    primero, solapado = await _hotel(sesion), await _hotel(sesion)
    primero_id, solapado_id = primero.id, solapado.id
    items = [
        _item_hotel(primero, "2027-02-10", "2027-02-15"),
        _item_hotel(solapado, "2027-02-13", "2027-02-18"),
    ]

    r = await _confirmar(c, sesion, items)

    assert r.status_code == 201
    assert r.json()["advertencias_itinerario"] == [
        {"hotel_id": str(solapado_id), "motivo": "superpuesto"}
    ]
    assert [t.hotel_id for t in await _tramos(sesion, r.json()["id"])] == [primero_id]


async def test_cu07_hotel_cerrado_despues_de_cotizar_se_omite_con_advertencia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    abierto = await _hotel(sesion)
    cerrado = await _hotel(sesion, estado=m.EstadoHotel.cerrado)
    abierto_id, cerrado_id = abierto.id, cerrado.id
    items = [
        _item_hotel(cerrado, "2027-02-10", "2027-02-14"),
        _item_hotel(abierto, "2027-02-14", "2027-02-20"),
    ]

    r = await _confirmar(c, sesion, items)

    assert r.status_code == 201
    assert r.json()["advertencias_itinerario"] == [
        {"hotel_id": str(cerrado_id), "motivo": "hotel_cerrado"}
    ]
    assert [t.hotel_id for t in await _tramos(sesion, r.json()["id"])] == [abierto_id]


async def test_cu07_venta_directa_sin_itinerario(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await _confirmar(c, sesion, None)

    assert r.status_code == 201
    assert r.json()["advertencias_itinerario"] == []
    assert await _tramos(sesion, r.json()["id"]) == []


async def test_cu07_cotizacion_sin_hoteles_crea_el_viaje_sin_itinerario(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await _confirmar(c, sesion, [{"concepto": "Aéreo", "precio": "50.00"}])

    assert r.status_code == 201
    assert r.json()["advertencias_itinerario"] == []
    assert await _tramos(sesion, r.json()["id"]) == []
