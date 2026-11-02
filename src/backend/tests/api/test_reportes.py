"""T-123: catálogo y generación de reportes del período en JSON.

CU-22; RF-131, RF-132, RF-134, RF-135. El contrato (rutas, parámetros, roles) lo cubre
`test_contrato_m8.py`; acá se fija el comportamiento. El contrato fija la forma genérica
(`columnas` + `filas` de dicts por `clave`), no las claves de cada reporte ni cómo se informan
las monedas. Supuestos que fijan estos tests y que el ticket no dice:

- Catálogo: los diez ids de DEC-0024 punto 10, en ese orden, cada uno con nombre y descripción.
- Las monedas van en columnas separadas con sufijo (`ventas_ars`, `ventas_usd`): una columna
  `importe` lleva su `moneda` en `ColumnaReporte` y las filas llevan el importe como texto decimal.
  Los enteros (cantidades) viajan como int.
- Reportes de una sola fila (agregados): `ventas` (`viajes`, `ventas_*`), `ganancia` (`ganancia_*`),
  `cobranzas` (`cobrado_*`, `pendiente_*`) y `pasajeros` (`pasajeros`).
- Reportes con una fila por grupo: `ventas-por-destino` (`destino`, `viajes`, `pasajeros`,
  `ventas_*`), `ventas-por-vendedor` (`vendedor`, `ventas_*`, `comisiones_*`; el `vendedor` es el
  nombre del Usuario) y `formas-de-pago` (`forma_pago`, `pagos`, `monto_*`).
- Mismas reglas del dashboard (DEC-0024): el período es inclusivo y por `created_at` del viaje;
  una venta es un viaje no cancelado; lo cobrado se mide por `fecha_cobro`; `pendiente` es la
  foto de hoy (pagos `pendiente` o `vencido`); la comisión va al vendedor, o al responsable si no hay vendedor;
  los pasajeros salen de `Oportunidad.pasajeros` de las ventas del período.
- Sin período, el mes en curso (de hoy en hora de Argentina).
- Período sin datos (A3): 200 con `columnas` completas y `filas == []` (no 404 ni error).
- Comparación (A2): `comparar_desde` y `comparar_hasta` van juntos; con ambos, `filas_comparadas`
  trae las filas del otro período con la misma forma; sin ellos es `null`. Si falta uno, o un
  período viene invertido, 422.
"""

import calendar
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy, sumar_meses
from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
URL = "/api/reportes"
PERIODO = {"desde": "2026-09-01", "hasta": "2026-09-30"}
PERIODO_ANTERIOR = {"comparar_desde": "2026-08-01", "comparar_hasta": "2026-08-31"}
EN_PERIODO = datetime(2026, 9, 15, 12, 0, tzinfo=UTC)
EN_PERIODO_ANTERIOR = datetime(2026, 8, 15, 12, 0, tzinfo=UTC)
FUERA_DE_AMBOS = datetime(2026, 6, 15, 12, 0, tzinfo=UTC)
IDS_CATALOGO = [
    "ventas",
    "ganancia",
    "cobranzas",
    "pagos-operadores",
    "ventas-por-destino",
    "ventas-por-operador",
    "ventas-por-vendedor",
    "pasajeros",
    "formas-de-pago",
    "comparacion-mensual",
]
CLAVES_DEL_REPORTE = {
    "id",
    "nombre",
    "desde",
    "hasta",
    "comparar_desde",
    "comparar_hasta",
    "columnas",
    "filas",
    "filas_comparadas",
}


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _viaje(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    precio: str = "1000000.00",
    costo: str = "750000.00",
    moneda: str = "ARS",
    creado: datetime = EN_PERIODO,
    destino: m.Destino | None = None,
    pasajeros: int | None = None,
    **campos: Any,
) -> m.Viaje:
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = destino or await f.crear(sesion, f.DestinoFactory)
    if pasajeros is not None:
        oportunidad = await f.crear(
            sesion,
            f.OportunidadFactory,
            cliente_id=cliente.id,
            responsable_id=responsable_id,
            pasajeros=pasajeros,
            estado=m.EstadoOportunidad.ganada,
        )
        campos["oportunidad_id"] = oportunidad.id
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


def _una_fila(cuerpo: dict[str, Any]) -> dict[str, Any]:
    assert len(cuerpo["filas"]) == 1
    return cuerpo["filas"][0]  # type: ignore[no-any-return]


def _por(cuerpo: dict[str, Any], clave: str, filas: str = "filas") -> dict[str, dict[str, Any]]:
    return {fila[clave]: fila for fila in cuerpo[filas]}


# --- Catálogo (RF-131) ---------------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf131_catalogo_lista_los_diez_reportes_de_cu22(
    cliente_como: Fabrica, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.get(URL)

    assert r.status_code == 200
    catalogo = r.json()
    assert [item["id"] for item in catalogo] == IDS_CATALOGO
    for item in catalogo:
        assert item["nombre"].strip()
        assert item["descripcion"].strip()


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
@pytest.mark.parametrize("ruta", [URL, f"{URL}/ventas"])
async def test_rf131_empleado_y_freelance_no_acceden_a_los_reportes(
    cliente_como: Fabrica, rol: str, ruta: str
) -> None:
    c = await cliente_como(rol)

    r = await c.get(ruta)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_rf131_sin_token_responde_401(cliente_sin_sesion: AsyncClient) -> None:
    r = await cliente_sin_sesion.get(URL)

    assert r.status_code == 401


# --- Generar (RF-131, RF-132) --------------------------------------------------------------


@pytest.mark.parametrize("reporte_id", IDS_CATALOGO)
async def test_rf131_cada_reporte_del_catalogo_se_genera_en_json(
    cliente_como: Fabrica, sesion: AsyncSession, reporte_id: str
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "400000.00", "pagado")

    r = await c.get(f"{URL}/{reporte_id}", params=PERIODO)

    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")
    cuerpo = r.json()
    assert set(cuerpo) == CLAVES_DEL_REPORTE
    assert cuerpo["id"] == reporte_id
    assert cuerpo["nombre"].strip()
    assert cuerpo["desde"] == "2026-09-01"
    assert cuerpo["hasta"] == "2026-09-30"
    assert cuerpo["filas_comparadas"] is None
    claves = {col["clave"] for col in cuerpo["columnas"]}
    assert claves
    for fila in cuerpo["filas"]:
        assert set(fila) <= claves


async def test_rf131_el_nombre_del_reporte_coincide_con_el_del_catalogo(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("dueno")
    catalogo = {item["id"]: item["nombre"] for item in (await c.get(URL)).json()}

    r = await c.get(f"{URL}/ganancia", params=PERIODO)

    assert r.json()["nombre"] == catalogo["ganancia"]


async def test_rf131_reporte_inexistente_responde_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/no-existe", params=PERIODO)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_rf131_columnas_de_importe_llevan_moneda_y_las_demas_no(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas", params=PERIODO)

    columnas = {col["clave"]: col for col in r.json()["columnas"]}
    assert columnas["viajes"]["tipo"] == "entero"
    assert columnas["viajes"]["moneda"] is None
    assert columnas["ventas_ars"]["tipo"] == "importe"
    assert columnas["ventas_ars"]["moneda"] == "ARS"
    assert columnas["ventas_usd"]["tipo"] == "importe"
    assert columnas["ventas_usd"]["moneda"] == "USD"


async def test_rf131_sin_periodo_el_reporte_es_el_del_mes_en_curso(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")
    hoy_ = hoy()
    ultimo = calendar.monthrange(hoy_.year, hoy_.month)[1]

    r = await c.get(f"{URL}/ventas")

    assert r.status_code == 200
    assert r.json()["desde"] == date(hoy_.year, hoy_.month, 1).isoformat()
    assert r.json()["hasta"] == date(hoy_.year, hoy_.month, ultimo).isoformat()


async def test_rf131_ventas_suma_los_viajes_del_periodo_por_moneda(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Cuentan los viajes del período y no cancelados; los extremos son inclusivos."""
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00")
    await _viaje(sesion, _yo(c), "500000.50", creado=datetime(2026, 9, 1, 3, 0, tzinfo=UTC))
    await _viaje(sesion, _yo(c), "2000.00", "1500.00", moneda="USD")
    await _viaje(sesion, _yo(c), "9999999.00", creado=EN_PERIODO_ANTERIOR)  # fuera del período
    await _viaje(
        sesion,
        _yo(c),
        "7777777.00",
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.vendido,
        motivo_cancelacion="El cliente desistió",
        fecha_cancelacion=date(2026, 9, 18),
    )

    r = await c.get(f"{URL}/ventas", params=PERIODO)

    fila = _una_fila(r.json())
    assert fila["viajes"] == 3
    assert Decimal(fila["ventas_ars"]) == Decimal("1500000.50")
    assert Decimal(fila["ventas_usd"]) == Decimal("2000.00")


async def test_rf131_ganancia_suma_venta_menos_costo_por_moneda(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await _viaje(sesion, _yo(c), "1000000.00", "800000.00")  # 200000.00
    await _viaje(sesion, _yo(c), "500000.50", "300000.25")  # 200000.25
    await _viaje(sesion, _yo(c), "2000.00", "1500.00", moneda="USD")  # 500.00
    await _viaje(sesion, _yo(c), "9999999.00", "1.00", creado=EN_PERIODO_ANTERIOR)

    r = await c.get(f"{URL}/ganancia", params=PERIODO)

    fila = _una_fila(r.json())
    assert Decimal(fila["ganancia_ars"]) == Decimal("400000.25")
    assert Decimal(fila["ganancia_usd"]) == Decimal("500.00")


async def test_rf131_cobranzas_separa_cobrado_del_periodo_y_pendiente_de_hoy(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    v1 = await _viaje(sesion, _yo(c))
    v_usd = await _viaje(sesion, _yo(c), "2000.00", "1500.00", moneda="USD")
    v_viejo = await _viaje(sesion, _yo(c), creado=FUERA_DE_AMBOS)
    await _pago(sesion, v1, "400000.00", "pagado")
    await _pago(sesion, v1, "300000.00", "pagado", fecha_cobro=date(2026, 8, 20))  # otro período
    await _pago(sesion, v1, "600000.00", "pendiente")
    await _pago(sesion, v1, "100000.00", "anulado")
    await _pago(sesion, v_usd, "800.00", "pagado")
    await _pago(sesion, v_usd, "1200.00", "vencido")
    await _pago(sesion, v_viejo, "50000.00", "pendiente")  # viaje de otro período, igual cuenta

    r = await c.get(f"{URL}/cobranzas", params=PERIODO)

    fila = _una_fila(r.json())
    assert Decimal(fila["cobrado_ars"]) == Decimal("400000.00")
    assert Decimal(fila["pendiente_ars"]) == Decimal("650000.00")
    assert Decimal(fila["cobrado_usd"]) == Decimal("800.00")
    assert Decimal(fila["pendiente_usd"]) == Decimal("1200.00")


async def test_rf131_ventas_por_destino_agrupa_viajes_y_pasajeros(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Los pasajeros suman `Oportunidad.pasajeros`; un viaje sin oportunidad suma viaje pero no
    pasajeros (DEC-0024 punto 7)."""
    c = await cliente_como("admin")
    bariloche = await f.crear(sesion, f.DestinoFactory, nombre="Bariloche")
    cancun = await f.crear(sesion, f.DestinoFactory, nombre="Cancún")
    await _viaje(sesion, _yo(c), "1000000.00", destino=bariloche, pasajeros=2)
    await _viaje(sesion, _yo(c), "600000.00", destino=bariloche, pasajeros=3)
    await _viaje(sesion, _yo(c), "400000.00", destino=bariloche)  # sin oportunidad
    await _viaje(sesion, _yo(c), "3000.00", "2000.00", moneda="USD", destino=cancun, pasajeros=4)
    await _viaje(sesion, _yo(c), "9999999.00", destino=cancun, creado=EN_PERIODO_ANTERIOR)

    r = await c.get(f"{URL}/ventas-por-destino", params=PERIODO)

    filas = _por(r.json(), "destino")
    assert set(filas) == {"Bariloche", "Cancún"}
    assert filas["Bariloche"]["viajes"] == 3
    assert filas["Bariloche"]["pasajeros"] == 5
    assert Decimal(filas["Bariloche"]["ventas_ars"]) == Decimal("2000000.00")
    assert filas["Cancún"]["viajes"] == 1
    assert filas["Cancún"]["pasajeros"] == 4
    assert Decimal(filas["Cancún"]["ventas_usd"]) == Decimal("3000.00")


async def test_rf132_ventas_por_vendedor_atribuye_la_comision_al_vendedor(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """DEC-0024 punto 6: la comisión va al vendedor y no al responsable; sin vendedor, al
    responsable. Porcentaje: ganancia x % / 100; importe: el importe fijo."""
    c = await cliente_como("admin")
    vendedora = await f.crear(
        sesion, f.UsuarioFactory, nombre="Vera Vendedora", rol=m.RolUsuario.freelance
    )
    await _viaje(  # ganancia 200000.00, 10 % = 20000.00, la cobra Vera
        sesion, _yo(c), "1000000.00", "800000.00", vendedor_id=vendedora.id
    )
    await _viaje(  # importe fijo 15000.00, la cobra Vera
        sesion,
        _yo(c),
        "500000.00",
        "300000.00",
        vendedor_id=vendedora.id,
        comision_tipo=m.TipoComision.importe,
        comision_vendedor=Decimal("15000.00"),
    )
    await _viaje(  # sin vendedor: ganancia 100000.00, 5 % = 5000.00 para el responsable
        sesion, _yo(c), "400000.00", "300000.00", comision_vendedor=Decimal("5.00")
    )

    r = await c.get(f"{URL}/ventas-por-vendedor", params=PERIODO)

    filas = _por(r.json(), "vendedor")
    assert set(filas) == {"Vera Vendedora", c.usuario.nombre}  # type: ignore[attr-defined]
    vera = filas["Vera Vendedora"]
    assert Decimal(vera["ventas_ars"]) == Decimal("1500000.00")
    assert Decimal(vera["comisiones_ars"]) == Decimal("35000.00")
    propia = filas[c.usuario.nombre]  # type: ignore[attr-defined]
    assert Decimal(propia["ventas_ars"]) == Decimal("400000.00")
    assert Decimal(propia["comisiones_ars"]) == Decimal("5000.00")


async def test_rf131_pasajeros_suma_los_de_las_ventas_del_periodo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await _viaje(sesion, _yo(c), pasajeros=2)
    await _viaje(sesion, _yo(c), pasajeros=3)
    await _viaje(sesion, _yo(c))  # sin oportunidad de origen
    await _viaje(sesion, _yo(c), pasajeros=7, creado=EN_PERIODO_ANTERIOR)
    await _viaje(
        sesion,
        _yo(c),
        pasajeros=9,
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.vendido,
        motivo_cancelacion="El cliente desistió",
        fecha_cancelacion=date(2026, 9, 18),
    )

    r = await c.get(f"{URL}/pasajeros", params=PERIODO)

    assert _una_fila(r.json())["pasajeros"] == 5


async def test_rf131_formas_de_pago_agrupa_los_cobros_del_periodo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "100000.00", "pagado", forma_pago=m.FormaPago.efectivo)
    await _pago(sesion, viaje, "200000.00", "pagado", forma_pago=m.FormaPago.efectivo)
    await _pago(sesion, viaje, "300000.00", "pagado", forma_pago=m.FormaPago.transferencia)
    await _pago(  # cobrado en otro período
        sesion,
        viaje,
        "999999.00",
        "pagado",
        forma_pago=m.FormaPago.cheque,
        fecha_cobro=date(2026, 8, 20),
    )
    await _pago(sesion, viaje, "50000.00", "pendiente")  # sin cobrar: no tiene forma de pago

    r = await c.get(f"{URL}/formas-de-pago", params=PERIODO)

    filas = _por(r.json(), "forma_pago")
    assert set(filas) == {"efectivo", "transferencia"}
    assert filas["efectivo"]["pagos"] == 2
    assert Decimal(filas["efectivo"]["monto_ars"]) == Decimal("300000.00")
    assert filas["transferencia"]["pagos"] == 1
    assert Decimal(filas["transferencia"]["monto_ars"]) == Decimal("300000.00")


async def test_rf131_ventas_por_operador_agrupa_por_operador_del_viaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Fila por operador (`operador`, `viajes`, `ventas_*`); los viajes sin operador van juntos."""
    c = await cliente_como("admin")
    despegar = await f.crear(sesion, f.OperadorFactory, nombre="Despegar")
    julia = await f.crear(sesion, f.OperadorFactory, nombre="Julia")
    await _viaje(sesion, _yo(c), "1000000.00", operador_id=despegar.id)
    await _viaje(sesion, _yo(c), "500000.00", operador_id=despegar.id)
    await _viaje(sesion, _yo(c), "300000.00", operador_id=julia.id)
    await _viaje(sesion, _yo(c), "9999999.00", operador_id=julia.id, creado=EN_PERIODO_ANTERIOR)

    r = await c.get(f"{URL}/ventas-por-operador", params=PERIODO)

    filas = _por(r.json(), "operador")
    assert set(filas) == {"Despegar", "Julia"}
    assert filas["Despegar"]["viajes"] == 2
    assert Decimal(filas["Despegar"]["ventas_ars"]) == Decimal("1500000.00")
    assert filas["Julia"]["viajes"] == 1
    assert Decimal(filas["Julia"]["ventas_ars"]) == Decimal("300000.00")


async def test_rf131_generar_un_reporte_no_modifica_datos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """CU-22 postcondición: solo lectura."""
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje, "400000.00", "pendiente")

    for reporte_id in IDS_CATALOGO:
        assert (await c.get(f"{URL}/{reporte_id}", params=PERIODO)).status_code == 200

    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente
    assert pago.monto == Decimal("400000.00")


# --- Comparar períodos (RF-134, A2) --------------------------------------------------------


async def test_rf134_comparar_trae_las_filas_del_otro_periodo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00")
    await _viaje(sesion, _yo(c), "250000.00", creado=EN_PERIODO_ANTERIOR)
    await _viaje(sesion, _yo(c), "125000.00", creado=EN_PERIODO_ANTERIOR)
    await _viaje(sesion, _yo(c), "9999999.00", creado=FUERA_DE_AMBOS)

    r = await c.get(f"{URL}/ventas", params={**PERIODO, **PERIODO_ANTERIOR})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["comparar_desde"] == "2026-08-01"
    assert cuerpo["comparar_hasta"] == "2026-08-31"
    actual = _una_fila(cuerpo)
    anterior = cuerpo["filas_comparadas"]
    assert len(anterior) == 1
    assert actual["viajes"] == 1
    assert Decimal(actual["ventas_ars"]) == Decimal("1000000.00")
    assert anterior[0]["viajes"] == 2
    assert Decimal(anterior[0]["ventas_ars"]) == Decimal("375000.00")


async def test_rf134_comparar_agrupados_trae_las_filas_de_cada_periodo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    bariloche = await f.crear(sesion, f.DestinoFactory, nombre="Bariloche")
    await _viaje(sesion, _yo(c), "100000.00", destino=bariloche)
    await _viaje(sesion, _yo(c), "700000.00", destino=bariloche, creado=EN_PERIODO_ANTERIOR)

    r = await c.get(f"{URL}/ventas-por-destino", params={**PERIODO, **PERIODO_ANTERIOR})

    cuerpo = r.json()
    assert Decimal(_por(cuerpo, "destino")["Bariloche"]["ventas_ars"]) == Decimal("100000.00")
    comparadas = _por(cuerpo, "destino", "filas_comparadas")
    assert Decimal(comparadas["Bariloche"]["ventas_ars"]) == Decimal("700000.00")


async def test_rf134_sin_parametros_de_comparacion_no_hay_filas_comparadas(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas", params=PERIODO)

    assert r.json()["comparar_desde"] is None
    assert r.json()["comparar_hasta"] is None
    assert r.json()["filas_comparadas"] is None


async def test_rf134_comparar_con_un_periodo_sin_datos_devuelve_lista_vacia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c))

    r = await c.get(f"{URL}/ventas", params={**PERIODO, **PERIODO_ANTERIOR})

    assert r.status_code == 200
    assert len(r.json()["filas"]) == 1
    assert r.json()["filas_comparadas"] == []


@pytest.mark.parametrize(
    "params",
    [
        {"comparar_desde": "2026-08-01"},
        {"comparar_hasta": "2026-08-31"},
        {"comparar_desde": "2026-08-31", "comparar_hasta": "2026-08-01"},
        {"desde": "2026-09-30", "hasta": "2026-09-01"},
    ],
    ids=["falta_hasta", "falta_desde", "comparacion_invertida", "periodo_invertido"],
)
async def test_rf134_periodos_incompletos_o_invertidos_responden_422(
    cliente_como: Fabrica, params: dict[str, str]
) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas", params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_rf134_comparacion_mensual_trae_el_mes_y_el_anterior(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """`comparacion-mensual` con período y comparación devuelve filas de ambos meses."""
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00")
    await _viaje(sesion, _yo(c), "250000.00", creado=EN_PERIODO_ANTERIOR)

    r = await c.get(f"{URL}/comparacion-mensual", params={**PERIODO, **PERIODO_ANTERIOR})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["filas"]
    assert cuerpo["filas_comparadas"]
    assert [(fila["mes"], Decimal(fila["ventas_ars"])) for fila in cuerpo["filas"]] == [
        ("2026-09", Decimal("1000000.00"))
    ]
    assert [(fila["mes"], Decimal(fila["ventas_ars"])) for fila in cuerpo["filas_comparadas"]] == [
        ("2026-08", Decimal("250000.00"))
    ]


# --- Período sin datos (RF-135, A3) ----------------------------------------------------------


@pytest.mark.parametrize("reporte_id", IDS_CATALOGO)
async def test_rf135_periodo_sin_datos_responde_200_con_columnas_y_sin_filas(
    cliente_como: Fabrica, sesion: AsyncSession, reporte_id: str
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), creado=EN_PERIODO_ANTERIOR)  # hay datos, pero en otro período

    r = await c.get(f"{URL}/{reporte_id}", params=PERIODO)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == reporte_id
    assert cuerpo["columnas"]
    assert cuerpo["filas"] == []
    assert cuerpo["filas_comparadas"] is None


async def test_rf135_sin_datos_en_ninguno_de_los_dos_periodos(cliente_como: Fabrica) -> None:
    c = await cliente_como("dueno")

    r = await c.get(f"{URL}/ventas", params={**PERIODO, **PERIODO_ANTERIOR})

    assert r.status_code == 200
    assert r.json()["filas"] == []
    assert r.json()["filas_comparadas"] == []


# --- Reporte mensual recurrente (A1) ---------------------------------------------------------


async def test_rf131_reporte_del_mes_es_el_mismo_con_o_sin_fechas_explicitas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """A1: el reporte mensual por defecto equivale a pedir el primer y último día del mes."""
    c = await cliente_como("admin")
    hoy_ = hoy()
    ultimo = calendar.monthrange(hoy_.year, hoy_.month)[1]
    ahora = datetime.now(UTC)
    await _viaje(sesion, _yo(c), "1000000.00", creado=ahora)

    por_defecto = await c.get(f"{URL}/ventas")
    explicito = await c.get(
        f"{URL}/ventas",
        params={
            "desde": date(hoy_.year, hoy_.month, 1).isoformat(),
            "hasta": date(hoy_.year, hoy_.month, ultimo).isoformat(),
        },
    )

    assert por_defecto.status_code == explicito.status_code == 200
    assert por_defecto.json() == explicito.json()
    assert Decimal(_una_fila(por_defecto.json())["ventas_ars"]) == Decimal("1000000.00")


# --- Foto de hoy, margen y rango por defecto (decisiones de la review) -----------------------


async def _tramo(sesion: AsyncSession, viaje: m.Viaje, orden: int, pagado: bool) -> None:
    hotel = await f.crear(sesion, f.HotelFactory, destino_id=viaje.destino_id)
    await f.crear(
        sesion,
        f.ViajeHotelFactory,
        viaje_id=viaje.id,
        hotel_id=hotel.id,
        orden=orden,
        pago_proveedor_realizado=pagado,
    )


async def test_rf131_pagos_operadores_es_la_foto_de_hoy_con_pagado_y_pendiente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Pagado: costo de los viajes con todos los tramos pagados; pendiente: con alguno sin pagar.
    No depende del período, no cuenta viajes sin tramos y no se compara."""
    c = await cliente_como("admin")
    pagado = await _viaje(sesion, _yo(c), "1000000.00", "600000.00", creado=FUERA_DE_AMBOS)
    await _tramo(sesion, pagado, 1, True)
    mixto = await _viaje(sesion, _yo(c), "900000.00", "500000.00", creado=FUERA_DE_AMBOS)
    await _tramo(sesion, mixto, 1, True)
    await _tramo(sesion, mixto, 2, False)
    debido_usd = await _viaje(sesion, _yo(c), "3000.00", "2000.00", moneda="USD")
    await _tramo(sesion, debido_usd, 1, False)
    await _viaje(sesion, _yo(c), "700000.00", "400000.00")  # sin tramos

    r = await c.get(f"{URL}/pagos-operadores", params={**PERIODO, **PERIODO_ANTERIOR})

    cuerpo = r.json()
    fila = _una_fila(cuerpo)
    assert Decimal(fila["pagado_ars"]) == Decimal("600000.00")
    assert Decimal(fila["pendiente_ars"]) == Decimal("500000.00")
    assert Decimal(fila["pagado_usd"]) == Decimal("0.00")
    assert Decimal(fila["pendiente_usd"]) == Decimal("2000.00")
    assert cuerpo["filas_comparadas"] is None


async def test_rf131_cobranzas_pendiente_es_de_hoy_y_la_comparacion_solo_trae_lo_cobrado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "400000.00", "pagado")
    await _pago(  # cuota pendiente con vencimiento en otro período: igual es deuda de hoy
        sesion, viaje, "250000.00", "pendiente", vencimiento=date(2026, 8, 5)
    )
    await _pago(sesion, viaje, "100000.00", "pagado", fecha_cobro=date(2026, 8, 20))

    r = await c.get(f"{URL}/cobranzas", params={**PERIODO, **PERIODO_ANTERIOR})

    cuerpo = r.json()
    principal = _una_fila(cuerpo)
    assert Decimal(principal["cobrado_ars"]) == Decimal("400000.00")
    assert Decimal(principal["pendiente_ars"]) == Decimal("250000.00")
    comparada = cuerpo["filas_comparadas"]
    assert len(comparada) == 1
    assert Decimal(comparada[0]["cobrado_ars"]) == Decimal("100000.00")
    assert Decimal(comparada[0]["pendiente_ars"]) == Decimal("0.00")


async def test_rf131_ganancia_incluye_el_margen_en_porcentaje_por_moneda(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await _viaje(sesion, _yo(c), "1000000.00", "800000.00")  # 20,00 %
    await _viaje(sesion, _yo(c), "3000.00", "2000.00", moneda="USD")  # 33,33 %

    r = await c.get(f"{URL}/ganancia", params=PERIODO)

    fila = _una_fila(r.json())
    assert fila["margen_ars"] == "20.00"
    assert fila["margen_usd"] == "33.33"


async def test_rf131_ganancia_con_ventas_en_una_sola_moneda_deja_el_margen_de_la_otra_en_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await _viaje(sesion, _yo(c), "1000000.00", "800000.00")

    r = await c.get(f"{URL}/ganancia", params=PERIODO)

    assert _una_fila(r.json())["margen_usd"] == "0.00"


async def test_rf134_comparacion_mensual_sin_fechas_son_los_ultimos_12_meses_con_ceros(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    este_mes = hoy().replace(day=1)
    hace_3 = sumar_meses(este_mes, -3)
    hace_12 = sumar_meses(este_mes, -12)
    await _viaje(sesion, _yo(c), "1000000.00", creado=datetime.now(UTC))
    await _viaje(
        sesion,
        _yo(c),
        "250000.00",
        creado=datetime(hace_3.year, hace_3.month, 15, 12, tzinfo=UTC),
    )
    await _viaje(  # fuera del rango por defecto
        sesion,
        _yo(c),
        "9999999.00",
        creado=datetime(hace_12.year, hace_12.month, 15, 12, tzinfo=UTC),
    )

    r = await c.get(f"{URL}/comparacion-mensual")

    cuerpo = r.json()
    meses = [sumar_meses(este_mes, -i) for i in range(11, -1, -1)]
    assert cuerpo["desde"] == meses[0].isoformat()
    assert [fila["mes"] for fila in cuerpo["filas"]] == [f"{mes:%Y-%m}" for mes in meses]
    ventas = {fila["mes"]: Decimal(fila["ventas_ars"]) for fila in cuerpo["filas"]}
    assert ventas[f"{este_mes:%Y-%m}"] == Decimal("1000000.00")
    assert ventas[f"{hace_3:%Y-%m}"] == Decimal("250000.00")
    assert sum(ventas.values()) == Decimal("1250000.00")
    assert Decimal(cuerpo["filas"][5]["ventas_usd"]) == Decimal("0.00")


async def test_rf135_comparacion_mensual_sin_ventas_en_el_rango_no_tiene_filas(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/comparacion-mensual")

    assert r.status_code == 200
    assert r.json()["filas"] == []


async def test_rf131_formas_de_pago_y_operadores_agrupan_lo_que_no_tiene_dato(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c), "100000.00")
    await _viaje(sesion, _yo(c), "50000.00")
    await _pago(sesion, viaje, "70000.00", "pagado", forma_pago=None)

    formas = await c.get(f"{URL}/formas-de-pago", params=PERIODO)
    operadores = await c.get(f"{URL}/ventas-por-operador", params=PERIODO)

    sin_forma = _por(formas.json(), "forma_pago")["Sin especificar"]
    assert sin_forma["pagos"] == 1
    assert Decimal(sin_forma["monto_ars"]) == Decimal("70000.00")
    sin_operador = _por(operadores.json(), "operador")["Sin operador"]
    assert sin_operador["viajes"] == 2
    assert Decimal(sin_operador["ventas_ars"]) == Decimal("150000.00")
