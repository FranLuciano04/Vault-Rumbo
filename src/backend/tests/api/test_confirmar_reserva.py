"""T-089: POST /oportunidades/{id}/confirmar-reserva (CU-07; RF-032 a RF-036; RNF-05; DEC-0005).

El contrato (rutas, forma del cuerpo, 401) ya lo cubre `test_contrato_m6.py`; acá se fija el
comportamiento. Supuestos que el ticket no dice de forma explícita y que fijan estos tests:

- Se puede confirmar una oportunidad `cotizada` con una cotización `aceptada` (flujo principal) o
  una `ganada` (venta directa, A1). Cualquier otra (`nueva`, `en_gestion`, `perdida`, `cotizada`
  sin cotización aceptada) responde 409 y no cambia nada. Una oportunidad deriva en a lo sumo un
  viaje: confirmar dos veces es 409.
- El viaje toma el cliente de la oportunidad, y su moneda de la cotización aceptada; en la venta
  directa, del cuerpo. El responsable es el del cuerpo o, por defecto, el de la oportunidad.
- Decisión de Paloma: se cumple el contrato. En la misma transacción se guardan la economía (con
  la comisión por defecto del vendedor, RN-01, o el override del cuerpo; como T-090) y el plan de
  pagos con una alerta `pago` por cuota (como T-092). Un plan que no suma el precio de venta es
  422 y no deja viaje, pagos ni alertas.
- Las alertas `formulario` y `salida` quedan pendientes, atadas al viaje y en la agenda del
  responsable. Fecha = fecha de salida menos la anticipación (del requisito, o de la configuración).
- Un destino inexistente o una fecha de regreso anterior a la de salida son 422.
- Permisos (DEC-0005): una oportunidad que el actor no ve (freelance, ajena) es 404; una ajena que
  ve pero no puede escribir (empleado) es 403; admin y dueño confirman cualquiera.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from rumbo.core.fechas import sumar_meses
from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"
SALIDA = date(2027, 2, 10)
REGRESO = date(2027, 2, 20)
PLAN = {
    "pagos": [
        {"monto": "400000.00", "tipo": "sena", "vencimiento": "2026-12-01"},
        {"monto": "600000.00", "tipo": "saldo", "vencimiento": "2027-01-15"},
    ]
}
ECONOMIA = {"precio_venta": "1000000.00", "costo": "800000.00"}


def _url(oportunidad_id: uuid.UUID) -> str:
    return f"/api/oportunidades/{oportunidad_id}/confirmar-reserva"


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


def _cuerpo(destino_id: uuid.UUID, **campos: Any) -> dict[str, Any]:
    return {
        "destino_id": str(destino_id),
        "fecha_salida": SALIDA.isoformat(),
        "fecha_regreso": REGRESO.isoformat(),
        "categoria": "individual",
        "economia": ECONOMIA,
        "plan_de_pagos": PLAN,
        **campos,
    }


async def _destino(sesion: AsyncSession) -> m.Destino:
    return await f.crear(sesion, f.DestinoFactory)


async def _oportunidad(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    estado: m.EstadoOportunidad = m.EstadoOportunidad.cotizada,
    cotizacion: m.EstadoCotizacion | None = m.EstadoCotizacion.aceptada,
    moneda: m.Moneda = m.Moneda.ARS,
) -> m.Oportunidad:
    """Una oportunidad con (o sin) una cotización en el estado dado."""
    cliente = await f.crear(sesion, f.ClienteFactory)
    campos: dict[str, Any] = {}
    if estado is m.EstadoOportunidad.perdida:
        campos["motivo_perdida"] = m.MotivoPerdida.precio  # oportunidad_motivo_perdida_ck
    oportunidad = await f.crear(
        sesion,
        f.OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=estado,
        **campos,
    )
    if cotizacion is not None:
        await f.crear(
            sesion,
            f.CotizacionFactory,
            oportunidad_id=oportunidad.id,
            moneda=moneda,
            estado=cotizacion,
        )
    return oportunidad


async def _viajes_de(sesion: AsyncSession, oportunidad_id: uuid.UUID) -> list[m.Viaje]:
    sesion.expire_all()
    consulta = select(m.Viaje).where(m.Viaje.oportunidad_id == oportunidad_id)
    return list((await sesion.scalars(consulta)).all())


async def _alertas_de(
    sesion: AsyncSession, viaje_id: uuid.UUID, tipo: m.TipoAlerta
) -> list[m.Alerta]:
    sesion.expire_all()
    consulta = select(m.Alerta).where(m.Alerta.viaje_id == viaje_id, m.Alerta.tipo == tipo)
    return list((await sesion.scalars(consulta)).all())


async def _pagos_de(sesion: AsyncSession, viaje_id: uuid.UUID) -> list[m.Pago]:
    sesion.expire_all()
    consulta = select(m.Pago).where(m.Pago.viaje_id == viaje_id).order_by(m.Pago.vencimiento)
    return list((await sesion.scalars(consulta)).all())


async def _total_de_pagos(sesion: AsyncSession) -> int:
    return int(await sesion.scalar(select(func.count()).select_from(m.Pago)) or 0)


async def _total_de_viajes(sesion: AsyncSession) -> int:
    return int(await sesion.scalar(select(func.count()).select_from(m.Viaje)) or 0)


async def _total_de_alertas(sesion: AsyncSession) -> int:
    return int(await sesion.scalar(select(func.count()).select_from(m.Alerta)) or 0)


async def _estado_de(sesion: AsyncSession, oportunidad_id: uuid.UUID) -> m.EstadoOportunidad:
    sesion.expire_all()
    oportunidad = await sesion.get(m.Oportunidad, oportunidad_id)
    assert oportunidad is not None
    return oportunidad.estado


async def _confirmar_ok(c: AsyncClient, sesion: AsyncSession, **campos: Any) -> m.Viaje:
    """Confirma una oportunidad propia del cliente y devuelve el viaje creado."""
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))
    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id, **campos))
    assert r.status_code == 201
    viajes = await _viajes_de(sesion, oportunidad.id)
    assert len(viajes) == 1
    return viajes[0]


# --- RF-032: crea el viaje reservado y gana la oportunidad ---


async def test_rf032_crea_viaje_reservado(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c), moneda=m.Moneda.USD)
    oportunidad_id, cliente_id = oportunidad.id, oportunidad.cliente_id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["estado"] == "reservado"
    assert cuerpo["oportunidad_id"] == str(oportunidad_id)
    assert cuerpo["cliente_id"] == str(cliente_id)
    assert cuerpo["destino_id"] == str(destino.id)
    assert cuerpo["fecha_salida"] == SALIDA.isoformat()
    assert cuerpo["fecha_regreso"] == REGRESO.isoformat()
    assert cuerpo["categoria"] == "individual"
    assert cuerpo["moneda"] == "USD"  # de la cotización aceptada
    assert cuerpo["responsable_id"] == str(_yo(c))  # el de la oportunidad, por defecto
    assert Decimal(cuerpo["precio_venta"]) == Decimal("1000000.00")
    assert Decimal(cuerpo["costo"]) == Decimal("800000.00")
    viajes = await _viajes_de(sesion, oportunidad_id)
    assert [(v.id, v.estado) for v in viajes] == [
        (uuid.UUID(cuerpo["id"]), m.EstadoViaje.reservado)
    ]


async def test_rf032_gana_la_oportunidad(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert r.status_code == 201
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.ganada


async def test_rf032_responsable_explicito(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    otro_id = otro.id
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id, responsable_id=str(otro_id)))

    assert r.status_code == 201
    assert r.json()["responsable_id"] == str(otro_id)


async def test_rf032_categoria_grupal(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")

    viaje = await _confirmar_ok(c, sesion, categoria="grupal")

    assert viaje.categoria == m.CategoriaViaje.grupal


# --- RF-033 (A3): destino y fechas obligatorios ---


@pytest.mark.parametrize("campo", ["destino_id", "fecha_salida", "fecha_regreso"])
async def test_rf033_sin_destino_ni_fechas_422(
    cliente_como: Fabrica, sesion: AsyncSession, campo: str
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id
    cuerpo = _cuerpo(destino.id)
    del cuerpo[campo]

    r = await c.post(_url(oportunidad_id), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


async def test_rf033_destino_inexistente_422(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(uuid.uuid4()))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


async def test_rf033_regreso_anterior_a_la_salida_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id
    cuerpo = _cuerpo(destino.id, fecha_regreso=(SALIDA - timedelta(days=1)).isoformat())

    r = await c.post(_url(oportunidad_id), json=cuerpo)

    assert r.status_code == 422
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


# --- Estados de la oportunidad que no admiten la reserva (409) ---


@pytest.mark.parametrize(
    ("estado", "cotizacion"),
    [
        (m.EstadoOportunidad.nueva, None),
        (m.EstadoOportunidad.en_gestion, None),
        (m.EstadoOportunidad.perdida, None),
        (m.EstadoOportunidad.perdida, m.EstadoCotizacion.rechazada),
        (m.EstadoOportunidad.cotizada, m.EstadoCotizacion.enviada),
        (m.EstadoOportunidad.cotizada, m.EstadoCotizacion.rechazada),
    ],
)
async def test_rf032_estado_que_no_admite_la_reserva_409(
    cliente_como: Fabrica,
    sesion: AsyncSession,
    estado: m.EstadoOportunidad,
    cotizacion: m.EstadoCotizacion | None,
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c), estado, cotizacion)
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _estado_de(sesion, oportunidad_id) == estado


async def test_rf032_confirmar_dos_veces_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id
    primera = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))
    assert primera.status_code == 201

    segunda = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert segunda.status_code == 409
    assert segunda.headers["content-type"].startswith(PROBLEM_JSON)
    assert len(await _viajes_de(sesion, oportunidad_id)) == 1


async def test_rf032_oportunidad_inexistente_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)

    r = await c.post(_url(uuid.uuid4()), json=_cuerpo(destino.id))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- A1: venta directa ---


async def test_venta_directa(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    """Oportunidad ya `ganada` y sin cotización: igual se confirma; la moneda viene del cuerpo."""
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c), m.EstadoOportunidad.ganada, cotizacion=None)
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id, moneda="USD"))

    assert r.status_code == 201
    assert r.json()["estado"] == "reservado"
    assert r.json()["moneda"] == "USD"
    assert r.json()["oportunidad_id"] == str(oportunidad_id)
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.ganada
    viajes = await _viajes_de(sesion, oportunidad_id)
    assert [v.estado for v in viajes] == [m.EstadoViaje.reservado]


# --- RF-034: alertas de requisitos del destino ---


async def test_rf034_alertas_de_requisitos(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    destino_id = destino.id
    await f.crear(
        sesion,
        f.RequisitoDestinoFactory,
        destino_id=destino_id,
        nombre="Visa",
        anticipacion_dias=30,
    )
    await f.crear(
        sesion,
        f.RequisitoDestinoFactory,
        destino_id=destino_id,
        nombre="Seguro",
        tipo=m.TipoRequisito.seguro,
        anticipacion_dias=10,
    )
    yo = _yo(c)  # antes de las consultas que hacen expire_all()
    oportunidad = await _oportunidad(sesion, yo)
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino_id))

    assert r.status_code == 201
    viaje_id = uuid.UUID(r.json()["id"])
    alertas = await _alertas_de(sesion, viaje_id, m.TipoAlerta.formulario)
    assert sorted(a.fecha for a in alertas) == [
        SALIDA - timedelta(days=30),
        SALIDA - timedelta(days=10),
    ]
    assert {a.estado for a in alertas} == {m.EstadoAlerta.pendiente}
    assert {a.propietario_id for a in alertas} == {yo}


async def test_rf034_las_alertas_van_al_responsable_del_viaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    otro_id = otro.id
    destino = await _destino(sesion)
    await f.crear(sesion, f.RequisitoDestinoFactory, destino_id=destino.id)
    oportunidad = await _oportunidad(sesion, _yo(c))

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id, responsable_id=str(otro_id)))

    assert r.status_code == 201
    viaje_id = uuid.UUID(r.json()["id"])
    # los propietario_id se leen antes de la consulta siguiente, que hace expire_all()
    formularios = [
        a.propietario_id for a in await _alertas_de(sesion, viaje_id, m.TipoAlerta.formulario)
    ]
    salidas = [a.propietario_id for a in await _alertas_de(sesion, viaje_id, m.TipoAlerta.salida)]
    assert formularios + salidas == [otro_id, otro_id]


async def test_rf034_solo_requisitos_activos_del_destino(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    otro_destino = await _destino(sesion)
    await f.crear(
        sesion,
        f.RequisitoDestinoFactory,
        destino_id=destino.id,
        nombre="Vigente",
        anticipacion_dias=20,
    )
    await f.crear(
        sesion,
        f.RequisitoDestinoFactory,
        destino_id=destino.id,
        nombre="Dado de baja",
        anticipacion_dias=45,
        activo=False,
    )
    await f.crear(
        sesion,
        f.RequisitoDestinoFactory,
        destino_id=otro_destino.id,
        nombre="De otro destino",
        anticipacion_dias=60,
    )
    oportunidad = await _oportunidad(sesion, _yo(c))

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id))

    assert r.status_code == 201
    alertas = await _alertas_de(sesion, uuid.UUID(r.json()["id"]), m.TipoAlerta.formulario)
    assert [a.fecha for a in alertas] == [SALIDA - timedelta(days=20)]


async def test_rf034_destino_sin_requisitos_no_genera_formularios(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """A2: sin requisitos no hay alertas de formulario, pero la reserva se confirma."""
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id))

    assert r.status_code == 201
    viaje_id = uuid.UUID(r.json()["id"])
    assert await _alertas_de(sesion, viaje_id, m.TipoAlerta.formulario) == []


# --- RF-035: alerta de salida ---


async def test_rf035_alerta_de_salida(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    """Con la configuración por defecto (7 días)."""
    c = await cliente_como("empleado")
    yo = _yo(c)  # antes de las consultas que hacen expire_all()

    viaje = await _confirmar_ok(c, sesion)

    alertas = await _alertas_de(sesion, viaje.id, m.TipoAlerta.salida)
    assert [(a.fecha, a.estado, a.propietario_id) for a in alertas] == [
        (SALIDA - timedelta(days=7), m.EstadoAlerta.pendiente, yo)
    ]


async def test_rf035_usa_la_anticipacion_configurada(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    configuracion = await sesion.get(m.Configuracion, 1)
    assert configuracion is not None
    configuracion.anticipacion_salida_dias = 15
    await sesion.flush()

    viaje = await _confirmar_ok(c, sesion)

    alertas = await _alertas_de(sesion, viaje.id, m.TipoAlerta.salida)
    assert [a.fecha for a in alertas] == [SALIDA - timedelta(days=15)]


async def test_rf035_venta_directa_tambien_agenda_la_salida(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c), m.EstadoOportunidad.ganada, cotizacion=None)

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id, moneda="ARS"))

    assert r.status_code == 201
    alertas = await _alertas_de(sesion, uuid.UUID(r.json()["id"]), m.TipoAlerta.salida)
    assert len(alertas) == 1


# --- CU-10 y CU-11 encadenados (RF-036): economía con comisión y plan de pagos ---


async def test_rf036_guarda_el_plan_de_pagos(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")

    viaje = await _confirmar_ok(c, sesion)

    pagos = await _pagos_de(sesion, viaje.id)
    assert [(p.tipo, p.monto, p.vencimiento, p.estado) for p in pagos] == [
        (m.TipoPago.sena, Decimal("400000.00"), date(2026, 12, 1), m.EstadoPago.pendiente),
        (m.TipoPago.saldo, Decimal("600000.00"), date(2027, 1, 15), m.EstadoPago.pendiente),
    ]


async def test_rf036_alertas_de_vencimiento_de_los_pagos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Como T-092 (RF-063): una alerta `pago` por cuota, un mes antes del vencimiento, en la
    agenda del responsable."""
    c = await cliente_como("empleado")
    yo = _yo(c)  # antes de las consultas que hacen expire_all()

    viaje = await _confirmar_ok(c, sesion)

    pagos = await _pagos_de(sesion, viaje.id)
    ids = [p.id for p in pagos]
    consulta = select(m.Alerta).where(m.Alerta.pago_id.in_(ids))
    alertas = {a.pago_id: a for a in (await sesion.scalars(consulta)).all()}
    assert sorted(alertas) == sorted(ids)
    for p in pagos:
        alerta = alertas[p.id]
        assert alerta.tipo == m.TipoAlerta.pago
        assert alerta.estado == m.EstadoAlerta.pendiente
        assert alerta.propietario_id == yo
        assert alerta.fecha == sumar_meses(p.vencimiento, -1)


async def test_rf036_las_alertas_de_pago_van_al_responsable_del_viaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    otro_id = otro.id
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id, responsable_id=str(otro_id)))

    assert r.status_code == 201
    pagos = await _pagos_de(sesion, uuid.UUID(r.json()["id"]))
    consulta = select(m.Alerta).where(m.Alerta.pago_id.in_([p.id for p in pagos]))
    assert {a.propietario_id for a in (await sesion.scalars(consulta)).all()} == {otro_id}


async def test_rn01_comision_por_defecto_del_vendedor(
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
    vendedor_id = vendedor.id
    economia = {**ECONOMIA, "vendedor_id": str(vendedor_id)}

    viaje = await _confirmar_ok(c, sesion, economia=economia)

    assert viaje.vendedor_id == vendedor_id
    assert viaje.comision_tipo == m.TipoComision("porcentaje")
    assert viaje.comision_vendedor == Decimal("12.50")


async def test_rf056_override_de_la_comision_al_confirmar(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    vendedor = await f.crear(
        sesion,
        f.UsuarioFactory,
        rol=m.RolUsuario("empleado"),
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )
    economia = {
        **ECONOMIA,
        "vendedor_id": str(vendedor.id),
        "comision_tipo": "importe",
        "comision_vendedor": "30000.00",
    }

    viaje = await _confirmar_ok(c, sesion, economia=economia)

    assert viaje.comision_tipo == m.TipoComision("importe")
    assert viaje.comision_vendedor == Decimal("30000.00")


async def test_rf057_sin_vendedor_comision_en_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    viaje = await _confirmar_ok(c, sesion)

    assert viaje.vendedor_id is None
    assert viaje.comision_vendedor == Decimal("0")


@pytest.mark.parametrize("monto_saldo", ["500000.00", "700000.01"])
async def test_rf061_plan_que_no_suma_el_precio_422(
    cliente_como: Fabrica, sesion: AsyncSession, monto_saldo: str
) -> None:
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    await f.crear(sesion, f.RequisitoDestinoFactory, destino_id=destino.id)
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id
    plan = {
        "pagos": [
            {"monto": "300000.00", "tipo": "sena", "vencimiento": "2026-12-01"},
            {"monto": monto_saldo, "tipo": "saldo", "vencimiento": "2027-01-15"},
        ]
    }
    viajes, pagos, alertas = (
        await _total_de_viajes(sesion),
        await _total_de_pagos(sesion),
        await _total_de_alertas(sesion),
    )

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id, plan_de_pagos=plan))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _total_de_viajes(sesion) == viajes
    assert await _total_de_pagos(sesion) == pagos
    assert await _total_de_alertas(sesion) == alertas
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


# --- RNF-05: una sola transacción ---


async def test_transaccion_atomica(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    """Si falla al guardar las alertas, no queda viaje, ni alertas, ni la oportunidad ganada."""
    c = await cliente_como("empleado")
    destino = await _destino(sesion)
    await f.crear(sesion, f.RequisitoDestinoFactory, destino_id=destino.id)
    oportunidad = await _oportunidad(sesion, _yo(c))
    oportunidad_id = oportunidad.id
    antes = await _total_de_alertas(sesion)
    pagos_antes = await _total_de_pagos(sesion)

    def _falla_al_guardar_alertas(s: Session, _contexto: Any) -> None:
        # después de insertar el viaje, en el mismo flush en que se insertan las alertas
        if any(isinstance(o, m.Alerta) for o in s.new):
            raise RuntimeError("falla simulada al guardar las alertas")

    event.listen(sesion.sync_session, "after_flush", _falla_al_guardar_alertas)
    try:
        r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))
    finally:
        event.remove(sesion.sync_session, "after_flush", _falla_al_guardar_alertas)

    assert r.status_code == 500
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _total_de_alertas(sesion) == antes
    assert await _total_de_pagos(sesion) == pagos_antes
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


# --- Permisos (RF-151, DEC-0005) ---


async def test_rf151_freelance_oportunidad_ajena_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, otro.id)
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


async def test_rf151_empleado_oportunidad_ajena_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    destino = await _destino(sesion)
    await f.crear(sesion, f.RequisitoDestinoFactory, destino_id=destino.id)
    oportunidad = await _oportunidad(sesion, otro.id)
    oportunidad_id = oportunidad.id
    antes = await _total_de_alertas(sesion)

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _viajes_de(sesion, oportunidad_id) == []
    assert await _total_de_alertas(sesion) == antes
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.cotizada


async def test_rf151_freelance_confirma_su_propia_oportunidad(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, _yo(c))

    r = await c.post(_url(oportunidad.id), json=_cuerpo(destino.id))

    assert r.status_code == 201
    assert r.json()["responsable_id"] == str(_yo(c))


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_direccion_confirma_oportunidad_ajena(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    otro_id = otro.id
    destino = await _destino(sesion)
    oportunidad = await _oportunidad(sesion, otro_id)
    oportunidad_id = oportunidad.id

    r = await c.post(_url(oportunidad_id), json=_cuerpo(destino.id))

    assert r.status_code == 201
    assert r.json()["responsable_id"] == str(otro_id)  # hereda el de la oportunidad, no el actor
    assert await _estado_de(sesion, oportunidad_id) == m.EstadoOportunidad.ganada
