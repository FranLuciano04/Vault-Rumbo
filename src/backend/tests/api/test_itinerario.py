"""T-097: itinerario de hoteles del viaje (CU-09; RF-043, RF-044, RF-046, RF-106, DEC-0003).

Endpoints: GET/POST /viajes/{id}/itinerario y PATCH/DELETE /tramos/{id}. El contrato (roles,
forma) ya lo cubre `test_contrato_m6.py`; acá se fija el comportamiento. Supuestos que el ticket
no dice de forma explícita y que fijan estos tests:

- Cuerpo del tramo: `hotel_id`, `check_in`, `check_out`, `orden` y, opcional,
  `vencimiento_pago_proveedor` (los campos de `viaje_hotel`). La respuesta devuelve además `id`,
  `viaje_id` y `pago_proveedor_realizado`.
- Fechas dentro del viaje: `fecha_salida <= check_in` y `check_out <= fecha_regreso`
  (extremos inclusivos); `check_out >= check_in`. Si no, 422.
- Sin solaparse: dos tramos se solapan si `check_in < otro.check_out` y `otro.check_in <
  check_out` (el check-out de uno puede ser el check-in del siguiente). Si no, 422.
- Hotel fuera del catálogo (A2): `hotel_id` inexistente responde 422 sobre `hotel_id` y no se
  crea nada; un hotel cerrado también.
- El GET devuelve los tramos ordenados por `orden`.
- Con `vencimiento_pago_proveedor` se genera una Alerta `pago` un mes antes, atada al tramo
  (`viaje_hotel_id`); al editar el vencimiento se reagenda, al marcar
  `pago_proveedor_realizado` o quitar el tramo se resuelve.
- Un viaje cancelado no admite cambios de itinerario (409).
"""

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
PROBLEM_JSON = "application/problem+json"
# El viaje de la fábrica va del 10/01/27 al 20/01/27.


def _url(viaje_id: uuid.UUID) -> str:
    return f"/api/viajes/{viaje_id}/itinerario"


def _url_tramo(tramo_id: uuid.UUID) -> str:
    return f"/api/tramos/{tramo_id}"


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
        **{"estado": m.EstadoViaje.reservado, **campos},
    )


async def _hotel(sesion: AsyncSession) -> m.Hotel:
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(sesion, f.HotelFactory, destino_id=destino.id)


async def _tramo(
    sesion: AsyncSession, viaje_id: uuid.UUID, hotel_id: uuid.UUID, **campos: Any
) -> m.ViajeHotel:
    return await f.crear(
        sesion, f.ViajeHotelFactory, viaje_id=viaje_id, hotel_id=hotel_id, **campos
    )


def _cuerpo(hotel_id: uuid.UUID, **campos: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "hotel_id": str(hotel_id),
        "check_in": "2027-01-10",
        "check_out": "2027-01-15",
        "orden": 1,
    }
    return {**base, **campos}


async def _tramos_de(sesion: AsyncSession, viaje_id: uuid.UUID) -> list[m.ViajeHotel]:
    sesion.expire_all()
    consulta = select(m.ViajeHotel).where(m.ViajeHotel.viaje_id == viaje_id)
    return list((await sesion.scalars(consulta.order_by(m.ViajeHotel.orden))).all())


async def _alertas_de_tramo(sesion: AsyncSession, tramo_id: uuid.UUID) -> list[m.Alerta]:
    sesion.expire_all()
    consulta = select(m.Alerta).where(m.Alerta.viaje_hotel_id == tramo_id)
    return list((await sesion.scalars(consulta)).all())


async def test_rf043_agregar_tramo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    r = await c.post(_url(viaje.id), json=_cuerpo(hotel.id))

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["hotel_id"] == str(hotel.id)
    assert cuerpo["viaje_id"] == str(viaje.id)
    assert cuerpo["check_in"] == "2027-01-10"
    assert cuerpo["check_out"] == "2027-01-15"
    assert cuerpo["orden"] == 1
    assert cuerpo["vencimiento_pago_proveedor"] is None
    assert cuerpo["pago_proveedor_realizado"] is False
    hotel_id = hotel.id
    tramos = await _tramos_de(sesion, viaje.id)
    assert [str(t.id) for t in tramos] == [cuerpo["id"]]
    assert tramos[0].hotel_id == hotel_id
    assert tramos[0].check_in == date(2027, 1, 10)


async def test_rf043_listar_itinerario_ordenado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    h1, h2 = await _hotel(sesion), await _hotel(sesion)
    await _tramo(
        sesion, viaje.id, h2.id, orden=2, check_in=date(2027, 1, 15), check_out=date(2027, 1, 20)
    )
    await _tramo(
        sesion, viaje.id, h1.id, orden=1, check_in=date(2027, 1, 10), check_out=date(2027, 1, 15)
    )

    r = await c.get(_url(viaje.id))

    assert r.status_code == 200
    assert [t["orden"] for t in r.json()] == [1, 2]
    assert [t["hotel_id"] for t in r.json()] == [str(h1.id), str(h2.id)]


async def test_rf043_tramo_con_vencimiento_genera_alerta_un_mes_antes(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    r = await c.post(
        _url(viaje.id), json=_cuerpo(hotel.id, vencimiento_pago_proveedor="2027-01-05")
    )

    assert r.status_code == 201
    assert r.json()["vencimiento_pago_proveedor"] == "2027-01-05"
    alertas = await _alertas_de_tramo(sesion, uuid.UUID(r.json()["id"]))
    assert len(alertas) == 1  # CU-09 paso 5
    assert alertas[0].tipo == m.TipoAlerta.pago
    assert alertas[0].fecha == date(2026, 12, 5)  # un mes antes del vencimiento
    assert alertas[0].estado == m.EstadoAlerta.pendiente


async def test_rf043_tramo_sin_vencimiento_no_genera_alerta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    r = await c.post(_url(viaje.id), json=_cuerpo(hotel.id))

    assert r.status_code == 201
    assert await _alertas_de_tramo(sesion, uuid.UUID(r.json()["id"])) == []


async def test_rf044_repetir_hotel(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    """A5: el mismo hotel en tramos no consecutivos (Buenos Aires, Bariloche, Buenos Aires)."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    porteno, bariloche = await _hotel(sesion), await _hotel(sesion)
    assert (await c.post(_url(viaje.id), json=_cuerpo(porteno.id))).status_code == 201
    r2 = await c.post(
        _url(viaje.id),
        json=_cuerpo(bariloche.id, check_in="2027-01-15", check_out="2027-01-17", orden=2),
    )
    assert r2.status_code == 201

    r3 = await c.post(
        _url(viaje.id),
        json=_cuerpo(porteno.id, check_in="2027-01-17", check_out="2027-01-20", orden=3),
    )

    assert r3.status_code == 201
    ids_hoteles = [porteno.id, bariloche.id, porteno.id]
    tramos = await _tramos_de(sesion, viaje.id)
    assert [t.hotel_id for t in tramos] == ids_hoteles
    assert len({t.id for t in tramos}) == 3  # cada tramo es una fila propia


async def test_rf106_viaje_sin_hoteles_es_valido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """A1: solo aéreo, excursión o crucero."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.get(_url(viaje.id))

    assert r.status_code == 200
    assert r.json() == []


async def test_rf046_editar_y_quitar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)
    tramo = await _tramo(sesion, viaje.id, hotel.id)

    r = await c.patch(
        _url_tramo(tramo.id), json={"check_in": "2027-01-11", "check_out": "2027-01-14"}
    )

    assert r.status_code == 200
    assert r.json()["id"] == str(tramo.id)
    assert r.json()["check_in"] == "2027-01-11"
    assert r.json()["check_out"] == "2027-01-14"
    assert r.json()["hotel_id"] == str(hotel.id)  # lo no enviado no cambia
    await sesion.refresh(tramo)
    assert tramo.check_in == date(2027, 1, 11)
    assert tramo.check_out == date(2027, 1, 14)

    url_itinerario = _url(viaje.id)
    borrado = await c.delete(_url_tramo(tramo.id))

    assert borrado.status_code == 204
    assert await _tramos_de(sesion, viaje.id) == []
    assert (await c.get(url_itinerario)).json() == []


async def test_rf046_editar_vencimiento_reagenda_la_alerta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """A3."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)
    creado = await c.post(
        _url(viaje.id), json=_cuerpo(hotel.id, vencimiento_pago_proveedor="2027-01-05")
    )
    tramo_id = uuid.UUID(creado.json()["id"])

    r = await c.patch(_url_tramo(tramo_id), json={"vencimiento_pago_proveedor": "2027-01-09"})

    assert r.status_code == 200
    alertas = await _alertas_de_tramo(sesion, tramo_id)
    assert len(alertas) == 1  # se reagenda, no se duplica
    assert alertas[0].fecha == date(2026, 12, 9)
    assert "09/01/27" in alertas[0].descripcion
    assert alertas[0].estado == m.EstadoAlerta.pendiente


async def test_rf046_pago_proveedor_realizado_resuelve_la_alerta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """A4."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)
    creado = await c.post(
        _url(viaje.id), json=_cuerpo(hotel.id, vencimiento_pago_proveedor="2027-01-05")
    )
    tramo_id = uuid.UUID(creado.json()["id"])

    r = await c.patch(_url_tramo(tramo_id), json={"pago_proveedor_realizado": True})

    assert r.status_code == 200
    assert r.json()["pago_proveedor_realizado"] is True
    alertas = await _alertas_de_tramo(sesion, tramo_id)
    assert [a.estado for a in alertas] == [m.EstadoAlerta.resuelta]


async def test_rf046_quitar_tramo_cierra_su_alerta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """A3: quitar el tramo no borra la alerta (FK SET NULL), la resuelve."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)
    tramo = await _tramo(sesion, viaje.id, hotel.id, vencimiento_pago_proveedor=date(2027, 1, 5))
    alerta = await f.crear(
        sesion,
        f.AlertaFactory,
        propietario_id=_yo(c),
        viaje_hotel_id=tramo.id,
        tipo=m.TipoAlerta.pago,
        fecha=date(2026, 12, 5),
    )

    r = await c.delete(_url_tramo(tramo.id))

    assert r.status_code == 204
    await sesion.refresh(alerta)
    assert alerta.estado == m.EstadoAlerta.resuelta


async def test_fechas_fuera_del_viaje_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    antes = await c.post(_url(viaje.id), json=_cuerpo(hotel.id, check_in="2027-01-09"))
    despues = await c.post(_url(viaje.id), json=_cuerpo(hotel.id, check_out="2027-01-21"))

    for r in (antes, despues):
        assert r.status_code == 422
        assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _tramos_de(sesion, viaje.id) == []


async def test_fechas_extremos_del_viaje_son_validos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    r = await c.post(
        _url(viaje.id), json=_cuerpo(hotel.id, check_in="2027-01-10", check_out="2027-01-20")
    )

    assert r.status_code == 201


async def test_checkout_anterior_al_checkin_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    r = await c.post(
        _url(viaje.id), json=_cuerpo(hotel.id, check_in="2027-01-15", check_out="2027-01-12")
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_tramos_solapados_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    h1, h2 = await _hotel(sesion), await _hotel(sesion)
    await _tramo(
        sesion, viaje.id, h1.id, orden=1, check_in=date(2027, 1, 10), check_out=date(2027, 1, 15)
    )

    r = await c.post(
        _url(viaje.id),
        json=_cuerpo(h2.id, check_in="2027-01-14", check_out="2027-01-18", orden=2),
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert len(await _tramos_de(sesion, viaje.id)) == 1


async def test_checkout_igual_al_checkin_siguiente_no_es_solapamiento(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    h1, h2 = await _hotel(sesion), await _hotel(sesion)
    await _tramo(
        sesion, viaje.id, h1.id, orden=1, check_in=date(2027, 1, 10), check_out=date(2027, 1, 15)
    )

    r = await c.post(
        _url(viaje.id),
        json=_cuerpo(h2.id, check_in="2027-01-15", check_out="2027-01-18", orden=2),
    )

    assert r.status_code == 201


async def test_editar_a_fechas_que_solapan_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    h1, h2 = await _hotel(sesion), await _hotel(sesion)
    await _tramo(
        sesion, viaje.id, h1.id, orden=1, check_in=date(2027, 1, 10), check_out=date(2027, 1, 15)
    )
    segundo = await _tramo(
        sesion, viaje.id, h2.id, orden=2, check_in=date(2027, 1, 15), check_out=date(2027, 1, 18)
    )

    solapa = await c.patch(_url_tramo(segundo.id), json={"check_in": "2027-01-12"})
    fuera = await c.patch(_url_tramo(segundo.id), json={"check_out": "2027-01-25"})

    for r in (solapa, fuera):
        assert r.status_code == 422
        assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(segundo)
    assert segundo.check_in == date(2027, 1, 15)
    assert segundo.check_out == date(2027, 1, 18)


async def test_editar_un_tramo_no_se_solapa_consigo_mismo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)
    tramo = await _tramo(
        sesion, viaje.id, hotel.id, check_in=date(2027, 1, 10), check_out=date(2027, 1, 15)
    )

    r = await c.patch(_url_tramo(tramo.id), json={"check_out": "2027-01-16"})

    assert r.status_code == 200


async def test_cu09_a2_hotel_fuera_del_catalogo_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))

    r = await c.post(_url(viaje.id), json=_cuerpo(uuid.uuid4()))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["errores"][0]["campo"] == "hotel_id"
    assert await _tramos_de(sesion, viaje.id) == []


async def test_cu09_viaje_inexistente_404(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    hotel = await _hotel(sesion)

    r = await c.post(_url(uuid.uuid4()), json=_cuerpo(hotel.id))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_cu09_tramo_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    editar = await c.patch(_url_tramo(uuid.uuid4()), json={"orden": 2})
    quitar = await c.delete(_url_tramo(uuid.uuid4()))

    assert editar.status_code == 404
    assert quitar.status_code == 404


async def test_cu09_viaje_cancelado_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(
        sesion,
        _yo(c),
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.reservado,
        motivo_cancelacion="El cliente desistió",
        fecha_cancelacion=date(2026, 11, 5),
    )
    hotel = await _hotel(sesion)

    r = await c.post(_url(viaje.id), json=_cuerpo(hotel.id))

    assert r.status_code == 409
    assert await _tramos_de(sesion, viaje.id) == []


async def test_rf151_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    hotel = await _hotel(sesion)
    tramo = await _tramo(sesion, viaje.id, hotel.id)

    agregar = await c.post(_url(viaje.id), json=_cuerpo(hotel.id, orden=2, check_in="2027-01-16"))
    editar = await c.patch(_url_tramo(tramo.id), json={"orden": 2})
    quitar = await c.delete(_url_tramo(tramo.id))

    assert (agregar.status_code, editar.status_code, quitar.status_code) == (403, 403, 403)
    assert len(await _tramos_de(sesion, viaje.id)) == 1


async def test_rf151_freelance_viaje_ajeno_404(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    hotel = await _hotel(sesion)
    tramo = await _tramo(sesion, viaje.id, hotel.id)

    assert (await c.get(_url(viaje.id))).status_code == 404
    assert (await c.patch(_url_tramo(tramo.id), json={"orden": 2})).status_code == 404
    assert (await c.delete(_url_tramo(tramo.id))).status_code == 404


async def test_rf151_direccion_arma_el_itinerario_de_otro(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id)
    hotel = await _hotel(sesion)

    r = await c.post(_url(viaje.id), json=_cuerpo(hotel.id))

    assert r.status_code == 201


async def test_rf046_desmarcar_pago_proveedor_vuelve_a_agendar(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)
    creado = await c.post(
        _url(viaje.id), json=_cuerpo(hotel.id, vencimiento_pago_proveedor="2027-01-05")
    )
    tramo_id = uuid.UUID(creado.json()["id"])
    await c.patch(_url_tramo(tramo_id), json={"pago_proveedor_realizado": True})

    r = await c.patch(_url_tramo(tramo_id), json={"pago_proveedor_realizado": False})

    assert r.status_code == 200
    abiertas = [
        a for a in await _alertas_de_tramo(sesion, tramo_id) if a.estado == m.EstadoAlerta.pendiente
    ]
    assert [a.fecha for a in abiertas] == [date(2026, 12, 5)]


async def test_cu09_hotel_cerrado_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    destino = await f.crear(sesion, f.DestinoFactory)
    cerrado = await f.crear(
        sesion, f.HotelFactory, destino_id=destino.id, estado=m.EstadoHotel.cerrado
    )

    r = await c.post(_url(viaje.id), json=_cuerpo(cerrado.id))

    assert r.status_code == 422
    assert r.json()["errores"][0]["campo"] == "hotel_id"
    assert await _tramos_de(sesion, viaje.id) == []


async def test_editar_a_hotel_cerrado_o_inexistente_422_y_otros_campos_con_hotel_cerrado_ok(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    destino = await f.crear(sesion, f.DestinoFactory)
    cerrado = await f.crear(
        sesion, f.HotelFactory, destino_id=destino.id, estado=m.EstadoHotel.cerrado
    )
    activo = await _hotel(sesion)
    tramo = await _tramo(sesion, viaje.id, activo.id)
    tramo_id, cerrado_id = tramo.id, cerrado.id
    cerrado_tramo = await _tramo(
        sesion,
        viaje.id,
        cerrado_id,
        orden=2,
        check_in=date(2027, 1, 15),
        check_out=date(2027, 1, 18),
    )

    inexistente = await c.patch(_url_tramo(tramo_id), json={"hotel_id": str(uuid.uuid4())})
    a_cerrado = await c.patch(_url_tramo(tramo_id), json={"hotel_id": str(cerrado_id)})
    otros_campos = await c.patch(_url_tramo(cerrado_tramo.id), json={"check_out": "2027-01-19"})

    assert (inexistente.status_code, a_cerrado.status_code) == (422, 422)
    assert inexistente.json()["errores"][0]["campo"] == "hotel_id"
    assert otros_campos.status_code == 200


async def test_orden_repetido_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    h1, h2 = await _hotel(sesion), await _hotel(sesion)
    await _tramo(
        sesion, viaje.id, h1.id, orden=1, check_in=date(2027, 1, 10), check_out=date(2027, 1, 15)
    )

    r = await c.post(
        _url(viaje.id), json=_cuerpo(h2.id, check_in="2027-01-15", check_out="2027-01-18", orden=1)
    )

    assert r.status_code == 422
    assert r.json()["errores"][0]["campo"] == "orden"
    assert len(await _tramos_de(sesion, viaje.id)) == 1


async def test_check_out_fuera_del_viaje_marca_check_out(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    hotel = await _hotel(sesion)

    r = await c.post(_url(viaje.id), json=_cuerpo(hotel.id, check_out="2027-01-21"))

    assert r.status_code == 422
    assert r.json()["errores"][0]["campo"] == "check_out"
