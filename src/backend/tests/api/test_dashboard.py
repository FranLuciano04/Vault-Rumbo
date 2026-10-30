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

T-122 (RF-124 resto, RF-125, RF-126, RF-128). Supuestos generales de los tests nuevos:

- Los contadores y la agenda son una foto de hoy (como `pendiente_de_cobrar`): no dependen del
  período. La agenda usa una ventana de `VENTANA_AGENDA` = 7 días, `[hoy, hoy + 7]` inclusive.
- Esquema nuevo: `viajes_activos` (int), `DestinoVendido.pasajeros` (int),
  `VentaPorVendedor.comisiones` (lista por moneda) y `detalles` (RF-128).
- Cada test repite en su docstring los supuestos propios.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
URL = "/api/dashboard"
PERIODO = {"desde": "2026-09-01", "hasta": "2026-09-30"}
EN_PERIODO = datetime(2026, 9, 15, 12, 0, tzinfo=UTC)
FUERA_DE_PERIODO = datetime(2026, 8, 15, 12, 0, tzinfo=UTC)
VENTANA_AGENDA = 7  # días hacia adelante de `proximos_vencimientos` y `viajes_proximos`


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
        **{"vencimiento": date(2026, 9, 25), **campos},
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


# --- T-122: indicadores operativos (RF-125), analítica (RF-126), RF-124 resto y RF-128 ---


def _en(dias: int) -> date:
    return hoy() + timedelta(days=dias)


def _salida(dias: int) -> dict[str, Any]:
    return {"fecha_salida": _en(dias), "fecha_regreso": _en(dias + 10)}


async def _viaje_a(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    destino: m.Destino,
    precio: str = "1000000.00",
    cliente_id: uuid.UUID | None = None,
    **campos: Any,
) -> m.Viaje:
    if cliente_id is None:
        cliente_id = (await f.crear(sesion, f.ClienteFactory)).id
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente_id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        precio_venta=Decimal(precio),
        costo=Decimal(campos.pop("costo", "0.00")),
        moneda=campos.pop("moneda", m.Moneda.ARS),
        estado=campos.pop("estado", m.EstadoViaje.vendido),
        created_at=campos.pop("created_at", EN_PERIODO),
        **campos,
    )


async def _con_pasajeros(
    sesion: AsyncSession, responsable_id: uuid.UUID, pasajeros: int | None
) -> m.Oportunidad:
    cliente = await f.crear(sesion, f.ClienteFactory)
    return await f.crear(
        sesion,
        f.OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=m.EstadoOportunidad.ganada,
        pasajeros=pasajeros,
        created_at=EN_PERIODO,
    )


def _cancelado() -> dict[str, Any]:
    return {
        "estado": m.EstadoViaje.cancelado,
        "estado_previo": m.EstadoViaje.vendido,
        "motivo_cancelacion": "Desistió",
        "fecha_cancelacion": date(2026, 9, 18),
    }


async def test_rf125_contadores_operativos_son_la_foto_de_hoy(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuestos: `consultas_pendientes` = oportunidades `nueva` + `en_gestion`;
    `presupuestos_abiertos` = oportunidades `cotizada`; `reservas_confirmadas` = viajes
    `confirmado`; `viajes_activos` = viajes ni `finalizado` ni `cancelado`;
    `alertas_pendientes` = alertas `pendiente` de pasajeros (pago, formulario, salida, viaje) del
    propietario. Todos son una foto de hoy: no dependen del período pedido."""
    c = await cliente_como("admin")
    for estado, cantidad in [("nueva", 2), ("en_gestion", 1), ("cotizada", 3), ("ganada", 4)]:
        for _ in range(cantidad):
            await _oportunidad(sesion, _yo(c), estado, creada=FUERA_DE_PERIODO)
    destino = await f.crear(sesion, f.DestinoFactory)
    for est_viaje, cantidad in [
        (m.EstadoViaje.reservado, 1),
        (m.EstadoViaje.vendido, 1),
        (m.EstadoViaje.confirmado, 2),
        (m.EstadoViaje.en_curso, 1),
        (m.EstadoViaje.finalizado, 3),
    ]:
        for _ in range(cantidad):
            await _viaje_a(sesion, _yo(c), destino, estado=est_viaje, created_at=FUERA_DE_PERIODO)
    await _viaje_a(sesion, _yo(c), destino, **_cancelado())
    for tipo, estado in [
        ("pago", "pendiente"),
        ("formulario", "pendiente"),
        ("pago", "resuelta"),  # resuelta: no cuenta
        ("manual", "pendiente"),  # no es de pasajeros: no cuenta
    ]:
        resuelta = {"resuelta_en": EN_PERIODO} if estado == "resuelta" else {}
        await f.crear(
            sesion,
            f.AlertaFactory,
            propietario_id=_yo(c),
            tipo=m.TipoAlerta(tipo),
            estado=m.EstadoAlerta(estado),
            **resuelta,
        )

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["consultas_pendientes"] == 3
    assert cuerpo["presupuestos_abiertos"] == 3
    assert cuerpo["reservas_confirmadas"] == 2
    assert cuerpo.get("viajes_activos") == 5  # reservado + vendido + 2 confirmados + en_curso
    assert cuerpo["alertas_pendientes"] == 2


async def test_rf125_agenda_de_vencimientos_y_viajes_en_la_ventana_de_7_dias(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuestos: ventana `[hoy, hoy + 7]` inclusive, ordenada por fecha ascendente.
    `proximos_vencimientos` = pagos `pendiente` con vencimiento en la ventana (un pago `vencido`
    ya pasó; uno `pagado` o `anulado` no vence); `viajes_proximos` = viajes no cancelados ni
    finalizados con `fecha_salida` en la ventana."""
    c = await cliente_como("admin")
    destino = await f.crear(sesion, f.DestinoFactory, nombre="Cusco")
    cliente = await f.crear(sesion, f.ClienteFactory, nombre="Marta Paz")
    cerca = await _viaje_a(sesion, _yo(c), destino, cliente_id=cliente.id, **_salida(2))
    hoy_mismo = await _viaje_a(sesion, _yo(c), destino, **_salida(0))
    borde = await _viaje_a(sesion, _yo(c), destino, **_salida(VENTANA_AGENDA))
    await _viaje_a(sesion, _yo(c), destino, **_salida(VENTANA_AGENDA + 1))  # fuera
    await _viaje_a(sesion, _yo(c), destino, **_salida(-1))  # ya salió
    await _viaje_a(sesion, _yo(c), destino, **_cancelado(), **_salida(3))
    p_cerca = await _pago(sesion, cerca, "100000.00", vencimiento=_en(3), tipo=m.TipoPago.cuota)
    p_borde = await _pago(sesion, cerca, "50000.00", vencimiento=_en(VENTANA_AGENDA))
    p_hoy = await _pago(sesion, borde, "70000.00", vencimiento=_en(0))
    await _pago(sesion, cerca, "1.00", vencimiento=_en(VENTANA_AGENDA + 1))
    await _pago(sesion, cerca, "2.00", "vencido", vencimiento=_en(-2))
    await _pago(sesion, cerca, "3.00", "pagado", vencimiento=_en(1))
    await _pago(sesion, cerca, "4.00", "anulado", vencimiento=_en(1))

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert [v["viaje_id"] for v in cuerpo["viajes_proximos"]] == [
        str(hoy_mismo.id),
        str(cerca.id),
        str(borde.id),
    ]
    proximo = cuerpo["viajes_proximos"][1]
    assert proximo["cliente_nombre"] == "Marta Paz"
    assert proximo["destino_nombre"] == "Cusco"
    assert proximo["fecha_salida"] == _en(2).isoformat()
    assert proximo["estado"] == "vendido"
    assert [v["pago_id"] for v in cuerpo["proximos_vencimientos"]] == [
        str(p_hoy.id),
        str(p_cerca.id),
        str(p_borde.id),
    ]
    venc = cuerpo["proximos_vencimientos"][1]
    assert venc["viaje_id"] == str(cerca.id)
    assert venc["cliente_nombre"] == "Marta Paz"
    assert venc["tipo"] == "cuota"
    assert Decimal(venc["monto"]) == Decimal("100000.00")
    assert venc["moneda"] == "ARS"
    assert venc["vencimiento"] == _en(3).isoformat()
    assert venc["estado"] == "pendiente"


async def test_rf125_agenda_y_contadores_sin_datos_vienen_vacios_y_en_cero(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("admin")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["proximos_vencimientos"] == []
    assert cuerpo["viajes_proximos"] == []
    for contador in [
        "consultas_pendientes",
        "presupuestos_abiertos",
        "reservas_confirmadas",
        "viajes_activos",
        "alertas_pendientes",
    ]:
        assert cuerpo.get(contador) == 0


async def test_rf125_viajes_activos_excluye_finalizados_y_cancelados(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuesto: «viaje activo» = en cualquier estado menos `finalizado` y `cancelado`, sin
    importar cuándo se creó (foto de hoy). Es el contador de «Tus viajes activos» (pantallas 46
    y 47)."""
    c = await cliente_como("empleado")
    destino = await f.crear(sesion, f.DestinoFactory)
    await _viaje_a(sesion, _yo(c), destino, estado=m.EstadoViaje.en_curso)
    await _viaje_a(
        sesion, _yo(c), destino, estado=m.EstadoViaje.confirmado, created_at=FUERA_DE_PERIODO
    )
    await _viaje_a(sesion, _yo(c), destino, estado=m.EstadoViaje.finalizado)
    await _viaje_a(sesion, _yo(c), destino, **_cancelado())

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert r.json().get("viajes_activos") == 2


async def test_rf126_destinos_mas_vendidos_con_pasajeros_por_destino(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """DEC-0024 punto 7: `pasajeros` suma `Oportunidad.pasajeros` de las ventas del período; un
    viaje sin oportunidad cuenta como viaje pero no suma pasajeros. Orden: más viajes primero y,
    a igual cantidad, por nombre. Un viaje cancelado o fuera del período no cuenta."""
    c = await cliente_como("dueno")
    roma = await f.crear(sesion, f.DestinoFactory, nombre="Roma")
    lima = await f.crear(sesion, f.DestinoFactory, nombre="Lima")
    for pasajeros in (2, 3):
        op = await _con_pasajeros(sesion, _yo(c), pasajeros)
        await _viaje_a(sesion, _yo(c), roma, oportunidad_id=op.id)
    await _viaje_a(sesion, _yo(c), roma)  # sin oportunidad de origen
    fuera = await _con_pasajeros(sesion, _yo(c), 9)
    await _viaje_a(sesion, _yo(c), roma, oportunidad_id=fuera.id, created_at=FUERA_DE_PERIODO)
    op = await _con_pasajeros(sesion, _yo(c), 4)
    await _viaje_a(sesion, _yo(c), lima, oportunidad_id=op.id)
    op = await _con_pasajeros(sesion, _yo(c), None)
    await _viaje_a(sesion, _yo(c), lima, oportunidad_id=op.id)
    op = await _con_pasajeros(sesion, _yo(c), 7)
    await _viaje_a(sesion, _yo(c), lima, oportunidad_id=op.id, **_cancelado())

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert [
        (d["destino_id"], d["destino_nombre"], d["viajes"], d["pasajeros"])
        for d in r.json()["destinos_mas_vendidos"]
    ] == [
        (str(roma.id), "Roma", 3, 5),
        (str(lima.id), "Lima", 2, 4),
    ]


async def test_rf126_destinos_mas_vendidos_es_un_top_5(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuesto: el ranking trae a lo sumo 5 destinos (los de más viajes)."""
    c = await cliente_como("admin")
    for i in range(6):
        destino = await f.crear(sesion, f.DestinoFactory, nombre=f"Destino {i}")
        for _ in range(6 - i):
            await _viaje_a(sesion, _yo(c), destino)

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert [d["destino_nombre"] for d in r.json()["destinos_mas_vendidos"]] == [
        f"Destino {i}" for i in range(5)
    ]


async def test_rf126_ticket_promedio_por_moneda(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuesto: ticket promedio = ventas de la moneda / cantidad de ventas de la moneda,
    redondeado half-up al centavo; no se mezclan ARS y USD (DEC-0007)."""
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00", "1.00")
    await _viaje(sesion, _yo(c), "500000.50", "1.00")
    await _viaje(sesion, _yo(c), "2000.00", "1.00", moneda="USD")
    await _viaje(sesion, _yo(c), "1001.00", "1.00", moneda="USD")
    await _viaje(sesion, _yo(c), "1001.00", "1.00", moneda="USD")  # 4002.00 / 3 = 1334.00
    await _viaje(sesion, _yo(c), "9999999.00", "1.00", creado=FUERA_DE_PERIODO)

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["ticket_promedio"]) == {
        "ARS": Decimal("750000.25"),
        "USD": Decimal("1334.00"),
    }


async def test_rf126_ventas_por_vendedor_con_comision_por_vendedor(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """DEC-0024 punto 6: el viaje se atribuye al `vendedor_id` o, si no tiene, a su responsable;
    cada fila trae `viajes`, `ventas` por moneda y `comisiones` por moneda (importe, o % sobre la
    ganancia; 0 si la ganancia no es positiva). Los cancelados no cuentan."""
    c = await cliente_como("admin")
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"), nombre="Ana")
    beto = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("freelance"), nombre="Beto")
    await _viaje(sesion, ana.id, "1000000.00", "800000.00", comision_vendedor=Decimal("10.00"))
    await _viaje(  # responsable ana, lo vendió beto
        sesion, ana.id, "400000.00", "300000.00", vendedor_id=beto.id, **_con_comision("8000.00")
    )
    await _viaje(
        sesion, beto.id, "3000.00", "2000.00", moneda="USD", comision_vendedor=Decimal("5.00")
    )
    await _viaje(sesion, ana.id, "7777777.00", "1.00", **_cancelado())

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    filas = {v["vendedor_id"]: v for v in r.json()["ventas_por_vendedor"]}
    assert set(filas) == {str(ana.id), str(beto.id)}
    assert filas[str(ana.id)]["vendedor_nombre"] == "Ana"
    assert filas[str(ana.id)]["viajes"] == 1
    assert _montos(filas[str(ana.id)]["ventas"]) == {"ARS": Decimal("1000000.00")}
    assert _montos(filas[str(ana.id)]["comisiones"]) == {"ARS": Decimal("20000.00")}
    assert filas[str(beto.id)]["viajes"] == 2
    assert _montos(filas[str(beto.id)]["ventas"]) == {
        "ARS": Decimal("400000.00"),
        "USD": Decimal("3000.00"),
    }
    assert _montos(filas[str(beto.id)]["comisiones"]) == {
        "ARS": Decimal("8000.00"),
        "USD": Decimal("50.00"),
    }


async def test_rf126_ventas_mensuales_comparan_con_los_5_meses_anteriores(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuesto: `ventas_mensuales` trae 6 meses seguidos, del más viejo al más nuevo, y el último
    es el mes de `hasta`. Cada uno trae el primer día del mes y las ventas por moneda (viajes no
    cancelados, por `created_at` en hora de Argentina); un mes sin ventas viene con la lista
    vacía. No se acota por `desde`."""
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00", "1.00")  # septiembre
    await _viaje(sesion, _yo(c), "500000.00", "1.00")
    await _viaje(sesion, _yo(c), "400000.00", "1.00", creado=FUERA_DE_PERIODO)  # agosto
    await _viaje(sesion, _yo(c), "1500.00", "1.00", moneda="USD", creado=FUERA_DE_PERIODO)
    await _viaje(sesion, _yo(c), "200000.00", "1.00", creado=datetime(2026, 6, 30, 12, tzinfo=UTC))
    await _viaje(sesion, _yo(c), "300000.00", "1.00", creado=datetime(2026, 4, 1, 12, tzinfo=UTC))
    await _viaje(sesion, _yo(c), "99999.00", "1.00", creado=datetime(2026, 3, 31, 12, tzinfo=UTC))
    await _viaje(sesion, _yo(c), "88888.00", "1.00", creado=datetime(2026, 10, 1, 12, tzinfo=UTC))
    await _viaje(sesion, _yo(c), "77777.00", "1.00", **_cancelado())

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    meses = r.json()["ventas_mensuales"]
    assert [mes["mes"] for mes in meses] == [
        "2026-04-01",
        "2026-05-01",
        "2026-06-01",
        "2026-07-01",
        "2026-08-01",
        "2026-09-01",
    ]
    por_mes = {mes["mes"]: _montos(mes["ventas"]) for mes in meses}
    assert por_mes == {
        "2026-04-01": {"ARS": Decimal("300000.00")},
        "2026-05-01": {},
        "2026-06-01": {"ARS": Decimal("200000.00")},
        "2026-07-01": {},
        "2026-08-01": {"ARS": Decimal("400000.00"), "USD": Decimal("1500.00")},
        "2026-09-01": {"ARS": Decimal("1500000.00")},
    }


async def test_rf126_ventas_mensuales_terminan_en_el_mes_de_hasta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "400000.00", "1.00", creado=FUERA_DE_PERIODO)

    r = await c.get(URL, params={"desde": "2026-08-10", "hasta": "2026-08-20"})

    assert r.status_code == 200
    meses = r.json()["ventas_mensuales"]
    assert [mes["mes"] for mes in meses][::5] == ["2026-03-01", "2026-08-01"]
    assert [_montos(mes["ventas"]) for mes in meses][-1:] == [{"ARS": Decimal("400000.00")}]


async def _tramo(
    sesion: AsyncSession, viaje: m.Viaje, hotel: m.Hotel, orden: int, pagado: bool
) -> None:
    await f.crear(
        sesion,
        f.ViajeHotelFactory,
        viaje_id=viaje.id,
        hotel_id=hotel.id,
        orden=orden,
        pago_proveedor_realizado=pagado,
    )


async def test_rf124_pendiente_de_pagar_a_operadores(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuesto (el modelo de T-098 guarda `pago_proveedor_realizado` por tramo de hotel, sin
    importe): se debe al operador el `costo` de cada viaje no cancelado que tenga al menos un
    tramo sin pagar al proveedor, por moneda del viaje y contado una sola vez. Es una foto de
    hoy, sin acotar al período. Un viaje sin tramos, o con todos pagados, no suma."""
    c = await cliente_como("admin")
    hotel = await f.crear(
        sesion, f.HotelFactory, destino_id=(await f.crear(sesion, f.DestinoFactory)).id
    )
    debe = await _viaje(sesion, _yo(c), "1000000.00", "700000.00")
    await _tramo(sesion, debe, hotel, 1, True)
    await _tramo(sesion, debe, hotel, 2, False)
    await _tramo(sesion, debe, hotel, 3, False)
    viejo_usd = await _viaje(
        sesion, _yo(c), "3000.00", "2000.00", moneda="USD", creado=FUERA_DE_PERIODO
    )
    await _tramo(sesion, viejo_usd, hotel, 1, False)
    saldado = await _viaje(sesion, _yo(c), "500000.00", "300000.00")
    await _tramo(sesion, saldado, hotel, 1, True)
    await _viaje(sesion, _yo(c), "500000.00", "400000.00")  # sin tramos
    cancelado = await _viaje(sesion, _yo(c), "500000.00", "250000.00", **_cancelado())
    await _tramo(sesion, cancelado, hotel, 1, False)

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert _montos(r.json()["pendiente_de_pagar"]) == {
        "ARS": Decimal("700000.00"),
        "USD": Decimal("2000.00"),
    }


async def test_rf124_pendiente_de_pagar_sin_deudas_viene_vacio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c))

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert r.json()["pendiente_de_pagar"] == []


async def test_rf128_cada_indicador_trae_lo_necesario_para_navegar_a_su_detalle(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Supuesto de contrato: cada elemento de las listas trae el id de lo que muestra
    (`pago_id` y `viaje_id`, `viaje_id`, `destino_id`, `vendedor_id`), y los contadores traen en
    `detalles[<contador>]` la `seccion` de la web (`oportunidades`, `viajes` o `alertas`) y los
    `filtros` (texto) del listado al que llevan. Un filtro por responsable de la dirección viaja
    en `filtros.responsable_id`."""
    c = await cliente_como("admin")
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    destino = await f.crear(sesion, f.DestinoFactory)
    viaje = await _viaje_a(sesion, ana.id, destino, **_salida(2))
    pago = await _pago(sesion, viaje, "100000.00", vencimiento=_en(1))

    r = await c.get(URL, params={**PERIODO, "responsable_id": str(ana.id)})

    assert r.status_code == 200
    cuerpo = r.json()
    assert [v["viaje_id"] for v in cuerpo["viajes_proximos"]] == [str(viaje.id)]
    assert [(p["pago_id"], p["viaje_id"]) for p in cuerpo["proximos_vencimientos"]] == [
        (str(pago.id), str(viaje.id))
    ]
    assert [d["destino_id"] for d in cuerpo["destinos_mas_vendidos"]] == [str(destino.id)]
    assert [v["vendedor_id"] for v in cuerpo["ventas_por_vendedor"]] == [str(ana.id)]
    detalles = cuerpo.get("detalles", {})
    esperado = {
        "consultas_pendientes": ("oportunidades", {"estado": "nueva,en_gestion"}),
        "presupuestos_abiertos": ("oportunidades", {"estado": "cotizada"}),
        "reservas_confirmadas": ("viajes", {"estado": "confirmado"}),
        "viajes_activos": ("viajes", {"activo": "true"}),
        "alertas_pendientes": ("alertas", {"estado": "pendiente"}),
    }
    assert set(detalles) >= set(esperado)
    for indicador, (seccion, filtros) in esperado.items():
        assert detalles[indicador]["seccion"] == seccion
        assert detalles[indicador]["filtros"] == {**filtros, "responsable_id": str(ana.id)}


async def test_rf128_los_filtros_de_detalle_no_llevan_responsable_si_no_se_filtro(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("dueno")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    assert r.json().get("detalles", {}).get("viajes_activos", {}).get("filtros") == {
        "activo": "true"
    }


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf129_indicadores_nuevos_acotados_por_rol(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    """El empleado y el freelance (acá sin clientes asignados) ven solo lo que llevan: los
    contadores, la agenda, los destinos, el ticket promedio, las ventas por vendedor, las ventas
    mensuales y el pendiente de pagar salen de sus viajes y oportunidades; lo ajeno no aparece."""
    c = await cliente_como(rol)
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    hotel = await f.crear(
        sesion, f.HotelFactory, destino_id=(await f.crear(sesion, f.DestinoFactory)).id
    )
    propio_destino = await f.crear(sesion, f.DestinoFactory, nombre="Propio")
    ajeno_destino = await f.crear(sesion, f.DestinoFactory, nombre="Ajeno")
    mio = await _viaje_a(
        sesion,
        _yo(c),
        propio_destino,
        "300000.00",
        costo="200000.00",
        estado=m.EstadoViaje.confirmado,
        **_salida(2),
    )
    ajeno = await _viaje_a(
        sesion,
        otro.id,
        ajeno_destino,
        "900000.00",
        costo="100000.00",
        estado=m.EstadoViaje.confirmado,
        **_salida(2),
    )
    await _pago(sesion, mio, "100000.00", vencimiento=_en(1))
    await _pago(sesion, ajeno, "900000.00", vencimiento=_en(1))
    await _tramo(sesion, mio, hotel, 1, False)
    await _tramo(sesion, ajeno, hotel, 1, False)
    await _oportunidad(sesion, _yo(c), "nueva")
    await _oportunidad(sesion, otro.id, "nueva")
    await _oportunidad(sesion, otro.id, "cotizada")

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["consultas_pendientes"] == 1
    assert cuerpo["presupuestos_abiertos"] == 0
    assert cuerpo["reservas_confirmadas"] == 1
    assert cuerpo.get("viajes_activos") == 1
    assert [v["viaje_id"] for v in cuerpo["viajes_proximos"]] == [str(mio.id)]
    assert [p["viaje_id"] for p in cuerpo["proximos_vencimientos"]] == [str(mio.id)]
    assert [d["destino_nombre"] for d in cuerpo["destinos_mas_vendidos"]] == ["Propio"]
    assert _montos(cuerpo["ticket_promedio"]) == {"ARS": Decimal("300000.00")}
    assert [v["vendedor_id"] for v in cuerpo["ventas_por_vendedor"]] == [str(_yo(c))]
    assert _montos(cuerpo["ventas_mensuales"][-1]["ventas"]) == {"ARS": Decimal("300000.00")}
    assert _montos(cuerpo["pendiente_de_pagar"]) == {"ARS": Decimal("200000.00")}


async def test_rf129_freelance_ve_la_agenda_de_los_viajes_de_sus_clientes(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """DEC-0024 punto 5 aplicado a los indicadores nuevos: el freelance ve los viajes de sus
    clientes y los que lleva, no los de clientes ajenos que lleva otro."""
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    ajeno = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    de_mi_cliente = await _viaje_a(sesion, otro.id, destino, cliente_id=mio.id, **_salida(1))
    que_llevo = await _viaje_a(sesion, _yo(c), destino, cliente_id=ajeno.id, **_salida(2))
    de_otro = await _viaje_a(sesion, otro.id, destino, cliente_id=ajeno.id, **_salida(3))
    await _pago(sesion, de_mi_cliente, "100000.00", vencimiento=_en(1))
    await _pago(sesion, de_otro, "100000.00", vencimiento=_en(1))

    r = await c.get(URL, params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert [v["viaje_id"] for v in cuerpo["viajes_proximos"]] == [
        str(de_mi_cliente.id),
        str(que_llevo.id),
    ]
    assert cuerpo.get("viajes_activos") == 2
    assert [p["viaje_id"] for p in cuerpo["proximos_vencimientos"]] == [str(de_mi_cliente.id)]


async def test_rf129_direccion_filtra_la_agenda_por_responsable(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    beto = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    destino = await f.crear(sesion, f.DestinoFactory)
    de_ana = await _viaje_a(sesion, ana.id, destino, **_salida(1))
    await _viaje_a(sesion, beto.id, destino, **_salida(1))
    await _oportunidad(sesion, ana.id, "nueva")
    await _oportunidad(sesion, beto.id, "nueva")

    r = await c.get(URL, params={**PERIODO, "responsable_id": str(ana.id)})

    assert r.status_code == 200
    cuerpo = r.json()
    assert [v["viaje_id"] for v in cuerpo["viajes_proximos"]] == [str(de_ana.id)]
    assert cuerpo.get("viajes_activos") == 1
    assert cuerpo["consultas_pendientes"] == 1
