"""T-090: economía del viaje con su comisión (CU-10 A1-A4; RF-055 a RF-059; RN-01; DEC-0007).

Supuestos de diseño (el ticket no fija la firma ni el transporte de las advertencias):
- `economia.registrar_economia(sesion, actor, viaje_id, datos) -> ResultadoEconomia`, con `.viaje`
  y `.advertencias` (lista de códigos: `ganancia_negativa`, `margen_negativo`,
  `plan_desbalanceado`). `datos` es el cuerpo de `EconomiaViaje` con `Decimal` y `UUID`.
- Ganancia y margen son columnas generadas de la base: el servicio solo escribe venta y costo.
- "Plan marcado como desbalanceado" no tiene columna: se deriva (suma de pagos no anulados
  distinta del precio de venta) y se informa con `plan_desbalanceado`.
- Sin vendedor, la comisión queda en 0.00 aunque el cuerpo traiga una.
"""

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from rumbo.negocio.errores import Conflicto, DatosInvalidos, NoEncontrado, SinPermiso
from rumbo.negocio.servicios import economia
from tests import fabricas as f


async def _empleado(sesion: AsyncSession, **campos: Any) -> m.Usuario:
    return await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"), **campos)


async def _viaje(sesion: AsyncSession, **campos: Any) -> m.Viaje:
    responsable = await _empleado(sesion)
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable.id,
        **campos,
    )


async def _registrar(
    sesion: AsyncSession,
    viaje: m.Viaje,
    datos: dict[str, Any],
    actor: m.Usuario | None = None,
) -> economia.ResultadoEconomia:
    if actor is None:
        actor = await sesion.get(m.Usuario, viaje.responsable_id)
    assert actor is not None
    return await economia.registrar_economia(sesion, actor, viaje.id, datos)


def _datos(**campos: Any) -> dict[str, Any]:
    return {"precio_venta": Decimal("1000000.00"), "costo": Decimal("800000.00"), **campos}


async def test_rf055_ganancia_y_margen(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(
        sesion, viaje, _datos(precio_venta=Decimal("1200000.50"), costo=Decimal("900000.25"))
    )

    assert r.viaje.precio_venta == Decimal("1200000.50")
    assert r.viaje.costo == Decimal("900000.25")
    assert r.viaje.ganancia == Decimal("300000.25")
    assert r.viaje.margen == (Decimal("300000.25") / Decimal("1200000.50")).quantize(
        Decimal("0.0001")
    )
    assert r.advertencias == []
    await sesion.refresh(viaje)
    assert viaje.ganancia == Decimal("300000.25")


async def test_rf055_precio_cero_deja_margen_nulo(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(sesion, viaje, _datos(precio_venta=Decimal("0"), costo=Decimal("0")))

    assert r.viaje.ganancia == Decimal("0")
    assert r.viaje.margen is None


async def test_rn01_comision_porcentaje_sobre_ganancia(sesion: AsyncSession) -> None:
    vendedor = await _empleado(
        sesion,
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )
    viaje = await _viaje(sesion)

    r = await _registrar(sesion, viaje, _datos(vendedor_id=vendedor.id))

    assert r.viaje.vendedor_id == vendedor.id
    assert r.viaje.comision_tipo == m.TipoComision("porcentaje")
    assert r.viaje.comision_vendedor == Decimal("10.00")  # % sobre la ganancia (200.000)
    assert r.viaje.ganancia == Decimal("200000.00")


async def test_rn01_comision_importe(sesion: AsyncSession) -> None:
    vendedor = await _empleado(
        sesion,
        comision_default_tipo=m.TipoComision("importe"),
        comision_default_valor=Decimal("15000.50"),
    )
    viaje = await _viaje(sesion)

    r = await _registrar(sesion, viaje, _datos(vendedor_id=vendedor.id))

    assert r.viaje.comision_tipo == m.TipoComision("importe")
    assert r.viaje.comision_vendedor == Decimal("15000.50")


async def test_rf056_override(sesion: AsyncSession) -> None:
    vendedor = await _empleado(
        sesion,
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )
    viaje = await _viaje(sesion)

    r = await _registrar(
        sesion,
        viaje,
        _datos(
            vendedor_id=vendedor.id,
            comision_tipo=m.TipoComision("importe"),
            comision_vendedor=Decimal("25000.00"),
        ),
    )

    assert r.viaje.comision_tipo == m.TipoComision("importe")
    assert r.viaje.comision_vendedor == Decimal("25000.00")
    await sesion.refresh(vendedor)  # el default del vendedor no se toca
    assert vendedor.comision_default_valor == Decimal("10.00")


async def test_rf056_override_porcentaje_mayor_a_100_es_invalido(sesion: AsyncSession) -> None:
    vendedor = await _empleado(sesion)
    viaje = await _viaje(sesion)

    with pytest.raises(DatosInvalidos):
        await _registrar(
            sesion,
            viaje,
            _datos(
                vendedor_id=vendedor.id,
                comision_tipo=m.TipoComision("porcentaje"),
                comision_vendedor=Decimal("100.01"),
            ),
        )


async def test_rf057_sin_vendedor(sesion: AsyncSession) -> None:
    viaje = await _viaje(
        sesion, comision_tipo=m.TipoComision("importe"), comision_vendedor=Decimal("5000.00")
    )

    r = await _registrar(sesion, viaje, _datos(vendedor_id=None))

    assert r.viaje.vendedor_id is None
    assert r.viaje.comision_vendedor == Decimal("0.00")
    assert r.viaje.ganancia == Decimal("200000.00")
    assert r.viaje.margen == Decimal("0.2000")


async def test_rf057_sin_vendedor_ignora_la_comision_enviada(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(
        sesion,
        viaje,
        _datos(
            vendedor_id=None,
            comision_tipo=m.TipoComision("importe"),
            comision_vendedor=Decimal("9000.00"),
        ),
    )

    assert r.viaje.comision_vendedor == Decimal("0.00")


async def test_rf058_negativo_advierte(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(
        sesion, viaje, _datos(precio_venta=Decimal("500000.00"), costo=Decimal("650000.00"))
    )

    assert economia.GANANCIA_NEGATIVA in r.advertencias
    assert economia.MARGEN_NEGATIVO in r.advertencias
    assert r.viaje.ganancia == Decimal("-150000.00")  # igual se guarda
    assert r.viaje.margen == Decimal("-0.3000")
    await sesion.refresh(viaje)
    assert viaje.costo == Decimal("650000.00")


async def test_rf058_ganancia_cero_no_advierte(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(
        sesion, viaje, _datos(precio_venta=Decimal("500000.00"), costo=Decimal("500000.00"))
    )

    assert r.advertencias == []


async def _con_plan(sesion: AsyncSession) -> m.Viaje:
    viaje = await _viaje(sesion, precio_venta=Decimal("1000000.00"), costo=Decimal("750000.00"))
    await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje.id,
        monto=Decimal("400000.00"),
        tipo=m.TipoPago("sena"),
        estado=m.EstadoPago("pagado"),
    )
    await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje.id,
        monto=Decimal("600000.00"),
        tipo=m.TipoPago("saldo"),
    )
    return viaje


async def test_rf059_cambio_de_precio_exige_rebalanceo(sesion: AsyncSession) -> None:
    viaje = await _con_plan(sesion)

    r = await _registrar(sesion, viaje, _datos(precio_venta=Decimal("1200000.00")))

    assert economia.PLAN_DESBALANCEADO in r.advertencias
    assert r.viaje.precio_venta == Decimal("1200000.00")
    # los pagos no se tocan: rebalancear es un paso aparte (PUT /viajes/{id}/pagos)
    montos = (await sesion.scalars(select(m.Pago.monto).where(m.Pago.viaje_id == viaje.id))).all()
    assert sorted(montos) == [Decimal("400000.00"), Decimal("600000.00")]


async def test_rf059_mismo_precio_no_exige_rebalanceo(sesion: AsyncSession) -> None:
    viaje = await _con_plan(sesion)

    r = await _registrar(sesion, viaje, _datos(precio_venta=Decimal("1000000.00")))

    assert economia.PLAN_DESBALANCEADO not in r.advertencias


async def test_rf059_sin_plan_no_exige_rebalanceo(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(sesion, viaje, _datos(precio_venta=Decimal("1500000.00")))

    assert economia.PLAN_DESBALANCEADO not in r.advertencias


async def test_rf059_pago_anulado_no_cuenta_en_el_plan(sesion: AsyncSession) -> None:
    viaje = await _con_plan(sesion)
    await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje.id,
        monto=Decimal("999.00"),
        estado=m.EstadoPago("anulado"),
    )

    r = await _registrar(sesion, viaje, _datos(precio_venta=Decimal("1000000.00")))

    assert economia.PLAN_DESBALANCEADO not in r.advertencias


async def test_rf059_volver_al_precio_del_plan_quita_la_advertencia(sesion: AsyncSession) -> None:
    viaje = await _con_plan(sesion)
    await _registrar(sesion, viaje, _datos(precio_venta=Decimal("1200000.00")))

    r = await _registrar(sesion, viaje, _datos(precio_venta=Decimal("1000000.00")))

    assert economia.PLAN_DESBALANCEADO not in r.advertencias


async def test_rf151_viaje_inexistente(sesion: AsyncSession) -> None:
    actor = await _empleado(sesion)

    with pytest.raises(NoEncontrado):
        await economia.registrar_economia(sesion, actor, uuid.uuid4(), _datos())


async def test_rf151_empleado_no_responsable_no_escribe(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    otro = await _empleado(sesion)

    with pytest.raises(SinPermiso):
        await _registrar(sesion, viaje, _datos(), actor=otro)


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_direccion_escribe_aunque_no_sea_responsable(
    sesion: AsyncSession, rol: str
) -> None:
    viaje = await _viaje(sesion)
    jefe = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario(rol))

    r = await _registrar(sesion, viaje, _datos(costo=Decimal("700000.00")), actor=jefe)

    assert r.viaje.costo == Decimal("700000.00")


async def test_rf151_freelance_ajeno_ve_404(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    freelance = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("freelance"))

    with pytest.raises(NoEncontrado):
        await _registrar(sesion, viaje, _datos(), actor=freelance)


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
async def test_cu10_viaje_cerrado_no_admite_economia(sesion: AsyncSession, estado: str) -> None:
    viaje = await _viaje(sesion, **_campos_estado(estado))

    with pytest.raises(Conflicto):
        await _registrar(sesion, viaje, _datos(costo=Decimal("1.00")))

    await sesion.refresh(viaje)
    assert viaje.costo == Decimal("750000.00")  # intacto
    assert viaje.precio_venta == Decimal("1000000.00")


async def test_cu10_viaje_en_curso_admite_economia(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion, estado=m.EstadoViaje("en_curso"))

    r = await _registrar(sesion, viaje, _datos(costo=Decimal("700000.00")))

    assert r.viaje.costo == Decimal("700000.00")


async def test_rf058_margen_extremo_se_guarda_y_advierte(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)

    r = await _registrar(
        sesion, viaje, _datos(precio_venta=Decimal("1.00"), costo=Decimal("5000.00"))
    )

    assert r.viaje.ganancia == Decimal("-4999.00")
    assert r.viaje.margen == Decimal("-4999.0000")
    assert economia.GANANCIA_NEGATIVA in r.advertencias
    assert economia.MARGEN_NEGATIVO in r.advertencias


async def test_rn01_freelance_ignora_la_comision_enviada(sesion: AsyncSession) -> None:
    freelance = await f.crear(
        sesion,
        f.UsuarioFactory,
        rol=m.RolUsuario("freelance"),
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("7.50"),
    )
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    viaje = await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=freelance.id,
    )

    r = await _registrar(
        sesion,
        viaje,
        _datos(
            vendedor_id=freelance.id,
            comision_tipo=m.TipoComision("importe"),
            comision_vendedor=Decimal("99999.00"),
        ),
        actor=freelance,
    )

    assert r.viaje.comision_tipo == m.TipoComision("porcentaje")
    assert r.viaje.comision_vendedor == Decimal("7.50")


async def test_cu10_operador_de_baja_es_invalido(sesion: AsyncSession) -> None:
    operador = await f.crear(sesion, f.OperadorFactory, activo=False)
    viaje = await _viaje(sesion)

    with pytest.raises(DatosInvalidos) as e:
        await _registrar(sesion, viaje, _datos(operador_id=operador.id))

    assert e.value.extra["errores"][0]["campo"] == "operador_id"


async def test_rf056_tipo_sin_valor_es_invalido(sesion: AsyncSession) -> None:
    vendedor = await _empleado(sesion)
    viaje = await _viaje(sesion)

    with pytest.raises(DatosInvalidos):
        await _registrar(
            sesion,
            viaje,
            _datos(vendedor_id=vendedor.id, comision_tipo=m.TipoComision("importe")),
        )


async def test_cu10_vendedor_de_baja_que_no_cambia_se_guarda(sesion: AsyncSession) -> None:
    vendedor = await _empleado(
        sesion,
        activo=False,
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("10.00"),
    )
    viaje = await _viaje(sesion, vendedor_id=vendedor.id)

    r = await _registrar(sesion, viaje, _datos(vendedor_id=vendedor.id))

    assert r.viaje.vendedor_id == vendedor.id
    assert r.viaje.comision_tipo == m.TipoComision("porcentaje")
    assert r.viaje.comision_vendedor == Decimal("10.00")
    assert r.viaje.precio_venta == Decimal("1000000.00")


async def test_cu10_operador_de_baja_que_no_cambia_se_guarda(sesion: AsyncSession) -> None:
    operador = await f.crear(sesion, f.OperadorFactory, activo=False)
    viaje = await _viaje(sesion, operador_id=operador.id)

    r = await _registrar(sesion, viaje, _datos(operador_id=operador.id))

    assert r.viaje.operador_id == operador.id
    assert r.viaje.costo == Decimal("800000.00")


async def test_cu10_cambiar_a_otro_vendedor_de_baja_es_invalido(sesion: AsyncSession) -> None:
    actual = await _empleado(sesion, activo=False)
    otro = await _empleado(sesion, activo=False)
    viaje = await _viaje(sesion, vendedor_id=actual.id)

    with pytest.raises(DatosInvalidos) as e:
        await _registrar(sesion, viaje, _datos(vendedor_id=otro.id))

    assert e.value.extra["errores"][0]["campo"] == "vendedor_id"


async def test_cu10_cambiar_a_otro_operador_de_baja_es_invalido(sesion: AsyncSession) -> None:
    actual = await f.crear(sesion, f.OperadorFactory, activo=False)
    otro = await f.crear(sesion, f.OperadorFactory, activo=False)
    viaje = await _viaje(sesion, operador_id=actual.id)

    with pytest.raises(DatosInvalidos) as e:
        await _registrar(sesion, viaje, _datos(operador_id=otro.id))

    assert e.value.extra["errores"][0]["campo"] == "operador_id"
