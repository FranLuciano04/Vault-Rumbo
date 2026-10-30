"""T-121: GET /dashboard, embudo e indicadores económicos (CU-21; RF-123, RF-124, RF-127, RF-129).

El contrato (roles, forma de la respuesta) ya lo cubre `test_contrato_m8.py`; acá se fija el
comportamiento. Los indicadores operativos (vencimientos, viajes próximos, contadores, destinos)
son de otro ticket y no se aseveran. Supuestos que fijan estos tests y que el ticket no dice:

- Período: es inclusivo en `desde` y `hasta`. Una oportunidad entra por su `created_at`; un viaje
  (una venta) por su `created_at`; un cobro por su `fecha_cobro`.
- «Venta»: viaje del período que no está `cancelado`. `ventas` suma `precio_venta` y
  `ganancia_estimada` suma `ganancia` (venta - costo), por moneda del viaje (DEC-0007).
- `cobrado`: suma de `monto_cobrado` de los pagos `pagado` con `fecha_cobro` en el período.
- `pendiente_de_cobrar`: foto de hoy (CU-21): suma de `monto` de todos los pagos `pendiente` o
  `vencido`, sin importar cuándo se creó el viaje (los `anulado` no cuentan).
- Embudo: `etapas` trae las cinco etapas (también con cantidad 0); `tasa_conversion` =
  ganadas / (ganadas + perdidas), 0 si no hay cerradas.
- `margen` (lista por moneda, fracción con 4 decimales) = ganancia total / ventas totales de la
  moneda (ponderado, DEC-0007: sobre el precio de venta), redondeado half-up a 4 decimales. Si las
  ventas de la moneda son 0 no se informa. `comisiones` (`list[MontoPorMoneda]`) suma la comisión
  del vendedor de cada venta: el importe si `comision_tipo` es `importe`, o ganancia x % / 100
  redondeado half-up al centavo si es `porcentaje` (0 si la ganancia no es positiva).
- Sin actividad: listas de importes vacías y conversión 0; las etapas del embudo en cero.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
URL = "/api/dashboard"
PERIODO = {"desde": "2026-09-01", "hasta": "2026-09-30"}
EN_PERIODO = datetime(2026, 9, 15, 12, 0, tzinfo=UTC)
FUERA_DE_PERIODO = datetime(2026, 8, 15, 12, 0, tzinfo=UTC)


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _oportunidad(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    estado: str = "nueva",
    creada: datetime = EN_PERIODO,
) -> m.Oportunidad:
    cliente = await f.crear(sesion, f.ClienteFactory)
    perdida = {"motivo_perdida": m.MotivoPerdida.precio} if estado == "perdida" else {}
    return await f.crear(
        sesion,
        f.OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=m.EstadoOportunidad(estado),
        created_at=creada,
        **perdida,
    )


async def _viaje(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    precio: str = "1000000.00",
    costo: str = "750000.00",
    moneda: str = "ARS",
    creado: datetime = EN_PERIODO,
    **campos: Any,
) -> m.Viaje:
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        precio_venta=Decimal(precio),
        costo=Decimal(costo),
        moneda=m.Moneda(moneda),
        estado=campos.pop("estado", m.EstadoViaje.vendido),
        created_at=creado,
        **campos,
    )


async def _pago(
    sesion: AsyncSession, viaje: m.Viaje, monto: str, estado: str = "pendiente", **campos: Any
) -> m.Pago:
    if estado == "pagado":
        campos = {
            "forma_pago": m.FormaPago.transferencia,
            "moneda_pago": viaje.moneda,
            "monto_cobrado": Decimal(monto),
            "fecha_cobro": date(2026, 9, 20),
            **campos,
        }
    return await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje.id,
        monto=Decimal(monto),
        estado=m.EstadoPago(estado),
        vencimiento=date(2026, 9, 25),
        **campos,
    )


def _montos(lista: list[dict[str, str]]) -> dict[str, Decimal]:
    return {item["moneda"]: Decimal(item["monto"]) for item in lista}


def _etapas(cuerpo: dict[str, Any]) -> dict[str, int]:
    return {e["estado"]: e["cantidad"] for e in cuerpo["embudo"]["etapas"]}


async def test_rf123_embudo_cuenta_por_estado_y_calcula_la_conversion(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    for estado, cantidad in [("nueva", 2), ("en_gestion", 1), ("ganada", 3), ("perdida", 1)]:
        for _ in range(cantidad):
            await _oportunidad(sesion, _yo(c), estado)
    await _oportunidad(sesion, _yo(c), "ganada", creada=FUERA_DE_PERIODO)  # fuera del período

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert _etapas(cuerpo) == {
        "nueva": 2,
        "en_gestion": 1,
        "cotizada": 0,
        "ganada": 3,
        "perdida": 1,
    }
    assert Decimal(cuerpo["embudo"]["tasa_conversion"]) == Decimal("0.7500")  # 3 / (3 + 1)


async def test_rf123_conversion_en_cero_si_no_hay_oportunidades_cerradas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _oportunidad(sesion, _yo(c), "nueva")
    await _oportunidad(sesion, _yo(c), "cotizada")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert Decimal(r.json()["embudo"]["tasa_conversion"]) == Decimal("0")


async def test_rf124_indicadores_economicos_por_moneda(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    v1 = await _viaje(  # ganancia 200000.00, comisión 10 % = 20000.00
        sesion, _yo(c), "1000000.00", "800000.00", comision_vendedor=Decimal("10.00")
    )
    v2 = await _viaje(  # ganancia 200000.25, comisión fija 15000.00
        sesion,
        _yo(c),
        "500000.50",
        "300000.25",
        comision_tipo=m.TipoComision.importe,
        comision_vendedor=Decimal("15000.00"),
    )
    v_usd = await _viaje(  # ganancia 500.00, comisión 5 % = 25.00
        sesion, _yo(c), "2000.00", "1500.00", moneda="USD", comision_vendedor=Decimal("5.00")
    )
    await _viaje(sesion, _yo(c), "9999999.00", "1.00", creado=FUERA_DE_PERIODO)
    await _viaje(
        sesion,
        _yo(c),
        "7777777.00",
        "1.00",
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.vendido,
        motivo_cancelacion="El cliente desistió",
        fecha_cancelacion=date(2026, 9, 18),
    )
    await _pago(sesion, v1, "400000.00", "pagado")
    await _pago(sesion, v1, "600000.00", "pendiente")
    await _pago(sesion, v2, "100000.25", "pagado")
    await _pago(sesion, v2, "200000.00", "vencido")
    await _pago(sesion, v2, "300000.25", "anulado")
    await _pago(sesion, v_usd, "800.00", "pagado")
    await _pago(sesion, v_usd, "1200.00", "pendiente")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert _montos(cuerpo["ventas"]) == {
        "ARS": Decimal("1500000.50"),
        "USD": Decimal("2000.00"),
    }
    assert _montos(cuerpo["ganancia_estimada"]) == {
        "ARS": Decimal("400000.25"),  # 200000.00 + 200000.25
        "USD": Decimal("500.00"),
    }
    assert _montos(cuerpo["margen"]) == {
        "ARS": Decimal("0.2667"),  # 400000.25 / 1500000.50
        "USD": Decimal("0.2500"),
    }
    assert _montos(cuerpo["comisiones"]) == {"ARS": Decimal("35000.00"), "USD": Decimal("25.00")}
    assert _montos(cuerpo["cobrado"]) == {"ARS": Decimal("500000.25"), "USD": Decimal("800.00")}
    assert _montos(cuerpo["pendiente_de_cobrar"]) == {
        "ARS": Decimal("800000.00"),
        "USD": Decimal("1200.00"),
    }


async def test_rf124_cobro_fuera_del_periodo_no_cuenta_como_cobrado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "300000.00", "pagado", fecha_cobro=date(2026, 8, 20))
    await _pago(sesion, viaje, "100000.00", "pagado", fecha_cobro=date(2026, 9, 30))

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["cobrado"]) == {"ARS": Decimal("100000.00")}


async def test_rf127_filtra_por_periodo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    await _oportunidad(sesion, _yo(c), "ganada")
    await _oportunidad(sesion, _yo(c), "ganada", creada=FUERA_DE_PERIODO)
    await _viaje(sesion, _yo(c), "1000000.00", "700000.00")
    await _viaje(sesion, _yo(c), "400000.00", "100000.00", creado=FUERA_DE_PERIODO)

    septiembre = await c.get(URL, params=PERIODO)
    agosto = await c.get(URL, params={"desde": "2026-08-01", "hasta": "2026-08-31"})

    assert septiembre.status_code == 200
    assert agosto.status_code == 200
    assert septiembre.json()["desde"] == "2026-09-01"
    assert septiembre.json()["hasta"] == "2026-09-30"
    assert _etapas(septiembre.json())["ganada"] == 1
    assert _montos(septiembre.json()["ventas"]) == {"ARS": Decimal("1000000.00")}
    assert agosto.json()["desde"] == "2026-08-01"
    assert _etapas(agosto.json())["ganada"] == 1
    assert _montos(agosto.json()["ventas"]) == {"ARS": Decimal("400000.00")}
    assert _montos(agosto.json()["ganancia_estimada"]) == {"ARS": Decimal("300000.00")}


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf127_direccion_filtra_por_responsable(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    beto = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    await _oportunidad(sesion, ana.id, "ganada")
    await _oportunidad(sesion, beto.id, "perdida")
    await _viaje(sesion, ana.id, "1000000.00", "600000.00")
    await _viaje(sesion, beto.id, "250000.00", "200000.00")

    todo = await c.get(URL, params=PERIODO)
    de_ana = await c.get(URL, params={**PERIODO, "responsable_id": str(ana.id)})

    assert todo.status_code == 200
    assert _montos(todo.json()["ventas"]) == {"ARS": Decimal("1250000.00")}
    assert de_ana.status_code == 200
    assert _montos(de_ana.json()["ventas"]) == {"ARS": Decimal("1000000.00")}
    assert _montos(de_ana.json()["ganancia_estimada"]) == {"ARS": Decimal("400000.00")}
    assert _etapas(de_ana.json())["ganada"] == 1
    assert _etapas(de_ana.json())["perdida"] == 0
    assert Decimal(de_ana.json()["embudo"]["tasa_conversion"]) == Decimal("1")


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf129_acotado_por_rol_ve_solo_lo_suyo(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    await _oportunidad(sesion, _yo(c), "ganada")
    await _oportunidad(sesion, otro.id, "ganada")
    await _oportunidad(sesion, otro.id, "nueva")
    propio = await _viaje(
        sesion,
        _yo(c),
        "300000.00",
        "200000.00",
        comision_tipo=m.TipoComision.importe,
        comision_vendedor=Decimal("5000.00"),
    )
    ajeno = await _viaje(
        sesion,
        otro.id,
        "900000.00",
        "100000.00",
        comision_tipo=m.TipoComision.importe,
        comision_vendedor=Decimal("77000.00"),
    )
    await _pago(sesion, propio, "100000.00", "pagado")
    await _pago(sesion, propio, "200000.00", "pendiente")
    await _pago(sesion, ajeno, "900000.00", "pagado")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert _etapas(cuerpo)["ganada"] == 1
    assert _etapas(cuerpo)["nueva"] == 0
    assert _montos(cuerpo["ventas"]) == {"ARS": Decimal("300000.00")}
    assert _montos(cuerpo["ganancia_estimada"]) == {"ARS": Decimal("100000.00")}
    assert _montos(cuerpo["margen"]) == {"ARS": Decimal("0.3333")}
    assert _montos(cuerpo["comisiones"]) == {"ARS": Decimal("5000.00")}
    assert _montos(cuerpo["cobrado"]) == {"ARS": Decimal("100000.00")}
    assert _montos(cuerpo["pendiente_de_cobrar"]) == {"ARS": Decimal("200000.00")}


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf129_responsable_ajeno_se_ignora_y_se_usa_el_propio(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    await _viaje(sesion, _yo(c), "300000.00", "200000.00")
    await _viaje(sesion, otro.id, "900000.00", "100000.00")

    r = await c.get(URL, params={**PERIODO, "responsable_id": str(otro.id)})

    assert r.status_code == 200
    assert _montos(r.json()["ventas"]) == {"ARS": Decimal("300000.00")}


async def test_periodo_sin_datos_devuelve_ceros(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _oportunidad(sesion, _yo(c), "ganada")  # actividad, pero en septiembre
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "300000.00", "pagado")

    r = await c.get(URL, params={"desde": "2026-01-01", "hasta": "2026-01-31"})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["desde"] == "2026-01-01"
    assert cuerpo["hasta"] == "2026-01-31"
    assert set(_etapas(cuerpo).values()) == {0}
    assert Decimal(cuerpo["embudo"]["tasa_conversion"]) == Decimal("0")
    for indicador in [
        "ventas",
        "ganancia_estimada",
        "margen",
        "comisiones",
        "cobrado",
        "pendiente_de_cobrar",
    ]:
        assert cuerpo[indicador] == [] or set(_montos(cuerpo[indicador]).values()) == {Decimal("0")}


async def test_rf124_pendiente_de_cobrar_incluye_viajes_anteriores_al_periodo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viejo = await _viaje(sesion, _yo(c), creado=FUERA_DE_PERIODO)
    await _pago(sesion, viejo, "250000.00", "pendiente")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["pendiente_de_cobrar"]) == {"ARS": Decimal("250000.00")}
    assert r.json()["ventas"] == []


async def test_rf124_comision_porcentual_con_ganancia_negativa_es_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "100000.00", "150000.00", comision_vendedor=Decimal("10.00"))

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["comisiones"]) == {"ARS": Decimal("0.00")}
    assert _montos(r.json()["ganancia_estimada"]) == {"ARS": Decimal("-50000.00")}


async def test_rf127_desde_posterior_a_hasta_responde_422(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(URL, params={"desde": "2026-09-30", "hasta": "2026-09-01"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_rf127_el_periodo_se_corta_en_hora_de_argentina(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    # 01/09 02:00 UTC = 31/08 23:00 en Argentina: es de agosto.
    await _viaje(sesion, _yo(c), creado=datetime(2026, 9, 1, 2, 0, tzinfo=UTC))

    septiembre = await c.get(URL, params=PERIODO)
    agosto = await c.get(URL, params={"desde": "2026-08-01", "hasta": "2026-08-31"})

    assert septiembre.json()["ventas"] == []
    assert _montos(agosto.json()["ventas"]) == {"ARS": Decimal("1000000.00")}


# --- DEC-0024 puntos 5 y 6: visibilidad del freelance y comisiones por vendedor ---


async def _viaje_de_cliente(
    sesion: AsyncSession,
    cliente_id: uuid.UUID,
    responsable_id: uuid.UUID,
    precio: str,
    costo: str = "0.00",
    **campos: Any,
) -> m.Viaje:
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente_id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        precio_venta=Decimal(precio),
        costo=Decimal(costo),
        moneda=m.Moneda.ARS,
        estado=m.EstadoViaje.vendido,
        created_at=EN_PERIODO,
        **campos,
    )


async def test_rf129_freelance_ve_viajes_de_sus_clientes_y_los_que_lleva(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    ajeno = await f.crear(sesion, f.ClienteFactory)
    await _viaje_de_cliente(sesion, mio.id, otro.id, "100000.00")  # cliente suyo, lo lleva otro
    await _viaje_de_cliente(sesion, ajeno.id, _yo(c), "20000.00")  # cliente ajeno, lo lleva él
    await _viaje_de_cliente(sesion, ajeno.id, otro.id, "9000000.00")  # no es suyo en nada

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["ventas"]) == {"ARS": Decimal("120000.00")}


async def test_rf129_freelance_ve_oportunidades_de_sus_clientes_y_las_que_lleva(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    ajeno = await f.crear(sesion, f.ClienteFactory)
    for cliente_id, responsable_id in [(mio.id, otro.id), (ajeno.id, _yo(c)), (ajeno.id, otro.id)]:
        await f.crear(
            sesion,
            f.OportunidadFactory,
            cliente_id=cliente_id,
            responsable_id=responsable_id,
            estado=m.EstadoOportunidad.nueva,
            created_at=EN_PERIODO,
        )

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _etapas(r.json())["nueva"] == 2


async def test_rf129_freelance_ignora_el_filtro_por_responsable_y_ve_su_visibilidad(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    await _viaje_de_cliente(sesion, mio.id, otro.id, "100000.00")

    r = await c.get(URL, params={**PERIODO, "responsable_id": str(otro.id)})

    assert r.status_code == 200
    assert _montos(r.json()["ventas"]) == {"ARS": Decimal("100000.00")}


async def test_rf129_empleado_sigue_acotado_a_los_viajes_donde_es_responsable(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    await _viaje_de_cliente(sesion, mio.id, otro.id, "100000.00")  # cliente suyo, responsable otro
    await _viaje_de_cliente(sesion, mio.id, _yo(c), "20000.00")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["ventas"]) == {"ARS": Decimal("20000.00")}


def _con_comision(importe: str) -> dict[str, Any]:
    return {"comision_tipo": m.TipoComision.importe, "comision_vendedor": Decimal(importe)}


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf124_comision_se_atribuye_al_vendedor_y_no_al_responsable(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    resp = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    vend = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    await _viaje(sesion, resp.id, vendedor_id=vend.id, **_con_comision("4000.00"))
    await _viaje(sesion, resp.id, **_con_comision("1000.00"))  # sin vendedor: va al responsable

    del_vendedor = await c.get(URL, params={**PERIODO, "responsable_id": str(vend.id)})
    del_responsable = await c.get(URL, params={**PERIODO, "responsable_id": str(resp.id)})
    todo = await c.get(URL, params=PERIODO)

    assert _montos(del_vendedor.json()["comisiones"]) == {"ARS": Decimal("4000.00")}
    assert _montos(del_responsable.json()["comisiones"]) == {"ARS": Decimal("1000.00")}
    assert _montos(todo.json()["comisiones"]) == {"ARS": Decimal("5000.00")}


async def test_rf124_empleado_suma_comision_de_los_viajes_donde_es_vendedor(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    await _viaje(sesion, _yo(c), vendedor_id=otro.id, **_con_comision("7000.00"))  # vende otro
    await _viaje(sesion, _yo(c), vendedor_id=_yo(c), **_con_comision("3000.00"))
    await _viaje(sesion, _yo(c), **_con_comision("500.00"))  # sin vendedor: responsable

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["comisiones"]) == {"ARS": Decimal("3500.00")}


async def test_rf124_freelance_suma_comision_de_los_viajes_donde_es_vendedor(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    await _viaje_de_cliente(sesion, mio.id, otro.id, "100000.00", **_con_comision("100.00"))
    await _viaje_de_cliente(
        sesion, mio.id, otro.id, "100000.00", vendedor_id=_yo(c), **_con_comision("2500.00")
    )
    await _viaje_de_cliente(
        sesion, mio.id, _yo(c), "100000.00", vendedor_id=otro.id, **_con_comision("9000.00")
    )

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["comisiones"]) == {"ARS": Decimal("2500.00")}


async def test_rf124_empleado_suma_la_comision_de_un_viaje_que_vendio_y_lleva_otro(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    await _viaje(sesion, otro.id, vendedor_id=_yo(c), **_con_comision("6000.00"))

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["comisiones"]) == {"ARS": Decimal("6000.00")}
