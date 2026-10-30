"""T-091: listar los viajes con su situación económica (CU-08; RF-037, RF-151).

Endpoints: GET /api/viajes y GET /api/viajes/{id}. Supuestos que el ticket no dice de forma
explícita y que fijan estos tests:

- El listado trae la misma forma `Viaje` que la ficha (con economía, saldo y porcentaje pagado) y
  va ordenado por fecha de salida ascendente (según el contrato).
- `mios=true` filtra por `responsable_id == actor` (los viajes que tengo asignados).
- `desde` y `hasta` filtran la fecha de salida, inclusive en ambos extremos.
- El freelance ve los viajes de sus clientes (`asesor_asignado_id`) o de los que es responsable
  (política de visibilidad); el resto es invisible: en el listado no aparece y en la ficha da 404.
- Los importes salen como texto decimal; `margen` es la fracción (0.25 = 25 %), con la escala que
  deje la base, así que se compara por valor `Decimal`.
- `cliente_nombre` y `destino_nombre` vienen resueltos en el listado y en la ficha.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from decimal import Decimal
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _viaje(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    *,
    cliente: m.Cliente | None = None,
    **campos: Any,
) -> m.Viaje:
    cliente = cliente or await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        **campos,
    )


async def _empleado_ajeno(sesion: AsyncSession) -> uuid.UUID:
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    return otro.id


def _ids(r: Any) -> list[str]:
    assert r.status_code == 200, r.text
    return [v["id"] for v in r.json()["items"]]


# --- Ficha (RF-037) ---


async def test_rf037_ficha_con_saldo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(
        sesion,
        _yo(c),
        precio_venta=Decimal("1000000.00"),
        costo=Decimal("750000.00"),
        comision_tipo=m.TipoComision("porcentaje"),
        comision_vendedor=Decimal("10.00"),
    )
    viaje_id = viaje.id
    await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje_id,
        monto=Decimal("300000.00"),
        estado=m.EstadoPago.pagado,
    )
    await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje_id,
        monto=Decimal("700000.00"),
        tipo=m.TipoPago("saldo"),
        estado=m.EstadoPago.pendiente,
    )

    r = await c.get(f"/api/viajes/{viaje_id}")

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["id"] == str(viaje_id)
    assert cuerpo["precio_venta"] == "1000000.00"
    assert cuerpo["costo"] == "750000.00"
    assert cuerpo["comision_tipo"] == "porcentaje"
    assert cuerpo["comision_vendedor"] == "10.00"
    assert cuerpo["saldo_pendiente"] == "700000.00"
    for campo in ("ganancia", "margen", "saldo_pendiente", "porcentaje_pagado"):
        assert isinstance(cuerpo[campo], str), campo
    assert Decimal(cuerpo["ganancia"]) == Decimal("250000")
    assert Decimal(cuerpo["margen"]) == Decimal("0.25")
    assert Decimal(cuerpo["porcentaje_pagado"]) == Decimal("0.3")


async def test_rf037_ficha_sin_pagos_saldo_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c))
    viaje_id = viaje.id

    r = await c.get(f"/api/viajes/{viaje_id}")

    assert r.status_code == 200, r.text
    assert Decimal(r.json()["saldo_pendiente"]) == 0
    assert Decimal(r.json()["porcentaje_pagado"]) == 0


async def test_rf037_ficha_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.get(f"/api/viajes/{uuid.uuid4()}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf037_ficha_trae_nombres_de_cliente_y_destino(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cliente = await f.crear(sesion, f.ClienteFactory, nombre="Marta Gómez")
    destino = await f.crear(sesion, f.DestinoFactory, nombre="Bariloche")
    viaje = await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=_yo(c),
    )
    viaje_id = viaje.id

    r = await c.get(f"/api/viajes/{viaje_id}")

    assert r.status_code == 200, r.text
    assert r.json()["cliente_nombre"] == "Marta Gómez"
    assert r.json()["destino_nombre"] == "Bariloche"


# --- Visibilidad (RF-151) ---


async def test_rf151_freelance_solo_lo_suyo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    yo = _yo(c)
    ajeno_id = await _empleado_ajeno(sesion)
    propio_por_responsable = await _viaje(sesion, yo)
    cliente_mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=yo)
    propio_por_cliente = await _viaje(sesion, ajeno_id, cliente=cliente_mio)
    ajeno = await _viaje(sesion, ajeno_id)
    esperados = {str(propio_por_responsable.id), str(propio_por_cliente.id)}
    ajeno_viaje_id = ajeno.id

    r = await c.get("/api/viajes")

    assert set(_ids(r)) == esperados
    assert r.json()["total"] == 2
    assert str(ajeno_viaje_id) not in _ids(r)


async def test_rf151_freelance_ficha_ajena_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    ajeno = await _viaje(sesion, await _empleado_ajeno(sesion))
    ajeno_id = ajeno.id

    r = await c.get(f"/api/viajes/{ajeno_id}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf151_freelance_ve_su_comision_en_la_ficha(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    viaje = await _viaje(
        sesion,
        _yo(c),
        comision_tipo=m.TipoComision("importe"),
        comision_vendedor=Decimal("45000.00"),
    )
    viaje_id = viaje.id

    r = await c.get(f"/api/viajes/{viaje_id}")

    assert r.status_code == 200, r.text
    assert r.json()["comision_tipo"] == "importe"
    assert r.json()["comision_vendedor"] == "45000.00"


async def test_rf151_empleado_ve_toda_la_agencia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    mio = await _viaje(sesion, _yo(c))
    ajeno = await _viaje(sesion, await _empleado_ajeno(sesion))
    esperados = {str(mio.id), str(ajeno.id)}

    r = await c.get("/api/viajes")

    assert set(_ids(r)) == esperados


# --- Listado: filtros ---


async def test_rf037_listado_trae_economia_y_nombres(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cliente = await f.crear(sesion, f.ClienteFactory, nombre="Juan Pérez")
    destino = await f.crear(sesion, f.DestinoFactory, nombre="Cancún")
    viaje = await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=_yo(c),
    )
    viaje_id = viaje.id
    await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje_id,
        monto=Decimal("250000.00"),
        estado=m.EstadoPago.pagado,
    )

    r = await c.get("/api/viajes")

    assert r.status_code == 200, r.text
    (item,) = r.json()["items"]
    assert item["id"] == str(viaje_id)
    assert item["cliente_nombre"] == "Juan Pérez"
    assert item["destino_nombre"] == "Cancún"
    assert item["precio_venta"] == "1000000.00"
    assert Decimal(item["ganancia"]) == Decimal("250000")
    assert isinstance(item["saldo_pendiente"], str)
    assert Decimal(item["porcentaje_pagado"]) == Decimal("0.25")


async def test_rf037_listado_filtra_por_estado(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    reservado = await _viaje(sesion, yo, estado=m.EstadoViaje.reservado)
    await _viaje(sesion, yo, estado=m.EstadoViaje.confirmado)
    reservado_id = str(reservado.id)

    r = await c.get("/api/viajes", params={"estado": "reservado"})

    assert _ids(r) == [reservado_id]
    assert r.json()["total"] == 1


async def test_rf037_listado_filtra_por_fechas_de_salida_inclusive(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    enero = await _viaje(
        sesion, yo, fecha_salida=date(2027, 1, 10), fecha_regreso=date(2027, 1, 20)
    )
    marzo = await _viaje(
        sesion, yo, fecha_salida=date(2027, 3, 10), fecha_regreso=date(2027, 3, 20)
    )
    junio = await _viaje(
        sesion, yo, fecha_salida=date(2027, 6, 10), fecha_regreso=date(2027, 6, 20)
    )
    enero_id, marzo_id, junio_id = str(enero.id), str(marzo.id), str(junio.id)

    ambos = await c.get("/api/viajes", params={"desde": "2027-01-10", "hasta": "2027-03-10"})
    solo_desde = await c.get("/api/viajes", params={"desde": "2027-03-11"})
    solo_hasta = await c.get("/api/viajes", params={"hasta": "2027-03-09"})

    assert _ids(ambos) == [enero_id, marzo_id]
    assert _ids(solo_desde) == [junio_id]
    assert _ids(solo_hasta) == [enero_id]


async def test_rf037_listado_ordenado_por_fecha_de_salida(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    tarde = await _viaje(sesion, yo, fecha_salida=date(2027, 6, 1), fecha_regreso=date(2027, 6, 9))
    temprano = await _viaje(
        sesion, yo, fecha_salida=date(2027, 2, 1), fecha_regreso=date(2027, 2, 9)
    )
    esperado = [str(temprano.id), str(tarde.id)]

    r = await c.get("/api/viajes")

    assert _ids(r) == esperado


async def test_rf037_listado_lo_mio(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    mio = await _viaje(sesion, _yo(c))
    await _viaje(sesion, await _empleado_ajeno(sesion))
    mio_id = str(mio.id)

    todos = await c.get("/api/viajes")
    solo_mios = await c.get("/api/viajes", params={"mios": "true"})

    assert todos.json()["total"] == 2
    assert _ids(solo_mios) == [mio_id]
    assert solo_mios.json()["total"] == 1


async def test_rf037_listado_filtra_por_cliente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    cliente = await f.crear(sesion, f.ClienteFactory)
    del_cliente = await _viaje(sesion, yo, cliente=cliente)
    await _viaje(sesion, yo)
    cliente_id, esperado = cliente.id, str(del_cliente.id)

    r = await c.get("/api/viajes", params={"cliente_id": str(cliente_id)})

    assert _ids(r) == [esperado]
    assert r.json()["total"] == 1


async def test_rf151_filtro_por_cliente_respeta_la_visibilidad_del_freelance(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """CU-17 A1: el selector de viaje de una reseña no filtra viajes ajenos del mismo cliente."""
    c = await cliente_como("freelance")
    yo = _yo(c)
    ajeno_id = await _empleado_ajeno(sesion)
    cliente = await f.crear(sesion, f.ClienteFactory)  # no es del freelance
    mio = await _viaje(sesion, yo, cliente=cliente)
    await _viaje(sesion, ajeno_id, cliente=cliente)
    cliente_id, esperado = cliente.id, str(mio.id)

    r = await c.get("/api/viajes", params={"cliente_id": str(cliente_id)})

    assert _ids(r) == [esperado]
    assert r.json()["total"] == 1


# --- Paginación ---


async def test_rf037_listado_paginado(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    creados = [
        await _viaje(
            sesion, yo, fecha_salida=date(2027, mes, 1), fecha_regreso=date(2027, mes, 9)
        )
        for mes in (1, 2, 3)
    ]
    ids = [str(v.id) for v in creados]

    p1 = await c.get("/api/viajes", params={"pagina": 1, "por_pagina": 2})
    p2 = await c.get("/api/viajes", params={"pagina": 2, "por_pagina": 2})

    assert _ids(p1) == ids[:2]
    assert _ids(p2) == ids[2:]
    assert p1.json()["total"] == 3
    assert (p1.json()["pagina"], p1.json()["por_pagina"]) == (1, 2)
    assert p2.json()["pagina"] == 2
