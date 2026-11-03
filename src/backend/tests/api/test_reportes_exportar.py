"""T-124: exportación de los reportes a Excel (openpyxl) y PDF (WeasyPrint). CU-22; RF-133.

Reutiliza `formato=xlsx|pdf` de `GET /api/reportes/{id}` (T-123). Supuestos que fijan estos tests y
que el ticket no dice:

- Content-Type del Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  del PDF: `application/pdf`.
- `Content-Disposition: attachment` con un nombre que contiene el id del reporte y la extensión
  (`.xlsx` / `.pdf`); el resto del nombre (p. ej. el período) no se fija.
- Excel: una hoja activa; una fila de encabezados con el `titulo` de cada columna del reporte (el
  mismo que en JSON) y debajo una fila por cada fila del reporte. Los importes y enteros son
  celdas numéricas (no texto). Las fechas del período (`desde`/`hasta`) figuran en algún lugar de
  la hoja en `dd/mm/aa`, ya sea como texto o como celda de fecha con formato `dd/mm/yy`.
- Con comparación, las filas del período comparado también están en el archivo.
- Un período sin datos igual da el archivo, con los encabezados y sin filas de datos (A3).
- PDF: solo se verifica que sea un PDF válido (no hay parser de PDF como dependencia).
"""

import io
from collections.abc import Awaitable, Callable
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from openpyxl import load_workbook
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f
from tests.api.test_reportes import (
    EN_PERIODO,
    EN_PERIODO_ANTERIOR,
    IDS_CATALOGO,
    PERIODO,
    PERIODO_ANTERIOR,
    _pago,
    _viaje,
    _yo,
)

Fabrica = Callable[[str], Awaitable[AsyncClient]]
URL = "/api/reportes"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _celdas(r: Any) -> list[list[Any]]:
    hoja = load_workbook(io.BytesIO(r.content)).active
    return [list(fila) for fila in hoja.iter_rows(values_only=True)]


def _fila_de_encabezados(celdas: list[list[Any]], titulos: list[str]) -> int:
    for i, fila in enumerate(celdas):
        if all(t in fila for t in titulos):
            return i
    raise AssertionError(f"No hay una fila con los encabezados {titulos}")


# --- Excel (RF-133) -------------------------------------------------------------------------


async def test_rf133_excel(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00")
    await _viaje(sesion, _yo(c), "500000.50")

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": "xlsx"})

    assert r.status_code == 200
    assert r.headers["content-type"].startswith(XLSX)
    assert r.content.startswith(b"PK")  # un .xlsx es un zip
    assert load_workbook(io.BytesIO(r.content)).active is not None


async def test_rf133_excel_tiene_encabezados_e_importes_numericos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00")
    await _viaje(sesion, _yo(c), "500000.50")
    await _viaje(sesion, _yo(c), "2000.00", "1500.00", moneda="USD")
    json_ = (await c.get(f"{URL}/ventas", params=PERIODO)).json()
    titulos = {col["clave"]: col["titulo"] for col in json_["columnas"]}

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": "xlsx"})

    celdas = _celdas(r)
    encabezado = _fila_de_encabezados(celdas, list(titulos.values()))
    datos = celdas[encabezado + 1]
    por_titulo = dict(zip(celdas[encabezado], datos, strict=False))
    viajes = por_titulo[titulos["viajes"]]
    ars = por_titulo[titulos["ventas_ars"]]
    usd = por_titulo[titulos["ventas_usd"]]
    for valor in (viajes, ars, usd):
        assert isinstance(valor, int | float | Decimal), f"{valor!r} no es numérico"
    assert viajes == 3
    assert Decimal(str(ars)) == Decimal("1500000.50")
    assert Decimal(str(usd)) == Decimal("2000.00")


async def test_rf133_excel_muestra_las_fechas_del_periodo_en_formato_local(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": "xlsx"})

    hoja = load_workbook(io.BytesIO(r.content)).active
    visibles: set[str] = set()
    for fila in hoja.iter_rows():
        for celda in fila:
            if isinstance(celda.value, str):
                visibles.add(celda.value)
            elif isinstance(celda.value, datetime | date):
                assert celda.number_format.lower() == "dd/mm/yy"
                visibles.add(celda.value.strftime("%d/%m/%y"))
    texto = " ".join(visibles)
    assert "01/09/26" in texto
    assert "30/09/26" in texto
    assert "2026-09-01" not in texto  # no se muestra en ISO


async def test_rf133_excel_con_filas_por_grupo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("dueno")
    bariloche = await f.crear(sesion, f.DestinoFactory, nombre="Bariloche")
    cancun = await f.crear(sesion, f.DestinoFactory, nombre="Cancún")
    await _viaje(sesion, _yo(c), "1000000.00", destino=bariloche, pasajeros=2)
    await _viaje(sesion, _yo(c), "3000.00", "2000.00", moneda="USD", destino=cancun, pasajeros=4)

    r = await c.get(f"{URL}/ventas-por-destino", params={**PERIODO, "formato": "xlsx"})

    celdas = _celdas(r)
    encabezado = _fila_de_encabezados(celdas, ["Destino", "Viajes", "Pasajeros"])
    filas = {fila[0]: fila for fila in celdas[encabezado + 1 :] if fila[0]}
    assert {"Bariloche", "Cancún"} <= set(filas)
    idx = celdas[encabezado].index("Pasajeros")
    assert filas["Bariloche"][idx] == 2
    assert filas["Cancún"][idx] == 4


async def test_rf133_excel_incluye_las_filas_del_periodo_comparado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00", creado=EN_PERIODO)
    await _viaje(sesion, _yo(c), "250000.00", creado=EN_PERIODO_ANTERIOR)

    r = await c.get(f"{URL}/ventas", params={**PERIODO, **PERIODO_ANTERIOR, "formato": "xlsx"})

    numeros = {
        Decimal(str(v)) for fila in _celdas(r) for v in fila if isinstance(v, int | float | Decimal)
    }
    assert Decimal("1000000.00") in numeros
    assert Decimal("250000.00") in numeros


async def test_rf135_excel_de_periodo_sin_datos_tiene_encabezados_y_no_filas(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("admin")
    json_ = (await c.get(f"{URL}/ventas", params=PERIODO)).json()
    titulos = [col["titulo"] for col in json_["columnas"]]

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": "xlsx"})

    assert r.status_code == 200
    celdas = _celdas(r)
    encabezado = _fila_de_encabezados(celdas, titulos)
    posteriores = [fila for fila in celdas[encabezado + 1 :] if any(v is not None for v in fila)]
    assert posteriores == []


@pytest.mark.parametrize("reporte_id", IDS_CATALOGO)
async def test_rf133_cada_reporte_del_catalogo_se_exporta_a_excel(
    cliente_como: Fabrica, sesion: AsyncSession, reporte_id: str
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "400000.00", "pagado")
    titulos = [
        col["titulo"]
        for col in (await c.get(f"{URL}/{reporte_id}", params=PERIODO)).json()["columnas"]
    ]

    r = await c.get(f"{URL}/{reporte_id}", params={**PERIODO, "formato": "xlsx"})

    assert r.status_code == 200
    _fila_de_encabezados(_celdas(r), titulos)


# --- PDF (RF-133) ---------------------------------------------------------------------------


async def test_rf133_pdf(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00")

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": "pdf"})

    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content.startswith(b"%PDF")


@pytest.mark.parametrize("reporte_id", IDS_CATALOGO)
async def test_rf133_cada_reporte_del_catalogo_se_exporta_a_pdf(
    cliente_como: Fabrica, sesion: AsyncSession, reporte_id: str
) -> None:
    c = await cliente_como("dueno")
    viaje = await _viaje(sesion, _yo(c))
    await _pago(sesion, viaje, "400000.00", "pagado")

    r = await c.get(f"{URL}/{reporte_id}", params={**PERIODO, "formato": "pdf"})

    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


async def test_rf135_pdf_de_periodo_sin_datos_igual_se_genera(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": "pdf"})

    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


# --- Nombre del archivo y tipo de contenido -------------------------------------------------


@pytest.mark.parametrize(
    ("formato", "extension"), [("xlsx", ".xlsx"), ("pdf", ".pdf")], ids=["xlsx", "pdf"]
)
async def test_rf133_nombre_del_archivo_lleva_el_reporte_y_la_extension(
    cliente_como: Fabrica, formato: str, extension: str
) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas-por-destino", params={**PERIODO, "formato": formato})

    disposicion = r.headers["content-disposition"]
    assert disposicion.startswith("attachment")
    assert "filename=" in disposicion
    assert "ventas-por-destino" in disposicion
    assert extension in disposicion


# --- Errores y permisos ---------------------------------------------------------------------


@pytest.mark.parametrize("formato", ["xlsx", "pdf"])
@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf133_empleado_y_freelance_no_exportan(
    cliente_como: Fabrica, rol: str, formato: str
) -> None:
    c = await cliente_como(rol)

    r = await c.get(f"{URL}/ventas", params={**PERIODO, "formato": formato})

    assert r.status_code == 403
    assert r.headers["content-type"].startswith("application/problem+json")


@pytest.mark.parametrize("formato", ["xlsx", "pdf"])
async def test_rf133_reporte_inexistente_responde_404(cliente_como: Fabrica, formato: str) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/no-existe", params={**PERIODO, "formato": formato})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")


@pytest.mark.parametrize("formato", ["xlsx", "pdf"])
async def test_rf133_periodo_invertido_responde_422(cliente_como: Fabrica, formato: str) -> None:
    c = await cliente_como("admin")

    r = await c.get(
        f"{URL}/ventas", params={"desde": "2026-09-30", "hasta": "2026-09-01", "formato": formato}
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_rf133_sin_formato_sigue_respondiendo_json(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(f"{URL}/ventas", params=PERIODO)

    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")


async def test_rf133_exportar_no_modifica_datos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje, "400000.00", "pendiente")

    for formato in ("xlsx", "pdf"):
        assert (
            await c.get(f"{URL}/cobranzas", params={**PERIODO, "formato": formato})
        ).status_code == 200

    await sesion.refresh(pago)
    assert pago.estado == m.EstadoPago.pendiente
    assert pago.monto == Decimal("400000.00")


# --- Revisión: fórmulas, márgenes y meses en el Excel -----------------------------------------


async def test_rf133_excel_no_ejecuta_como_formula_un_texto_que_empieza_con_igual(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    peligroso = await f.crear(sesion, f.DestinoFactory, nombre="=1+1")
    await _viaje(sesion, _yo(c), destino=peligroso)

    r = await c.get(f"{URL}/ventas-por-destino", params={**PERIODO, "formato": "xlsx"})

    hoja = load_workbook(io.BytesIO(r.content)).active
    celdas = [celda for fila in hoja.iter_rows() for celda in fila if celda.value == "=1+1"]
    assert celdas
    assert all(celda.data_type != "f" for celda in celdas)


async def test_rf133_excel_margen_es_numerico_con_dos_decimales(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c), "1000000.00", "750000.00")

    r = await c.get(f"{URL}/ganancia", params={**PERIODO, "formato": "xlsx"})

    hoja = load_workbook(io.BytesIO(r.content)).active
    celdas = {
        fila[0].value: fila[1]
        for fila in hoja.iter_rows(min_row=1)
        if len(fila) > 1 and fila[0].value is not None
    }
    margen = [
        celda
        for fila in hoja.iter_rows()
        for celda in fila
        if isinstance(celda.value, int | float | Decimal) and celda.number_format == "0.00"
    ]
    assert celdas
    assert any(Decimal(str(celda.value)) == Decimal("25.00") for celda in margen)


async def test_rf133_excel_muestra_el_mes_en_formato_local(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _viaje(sesion, _yo(c))

    r = await c.get(f"{URL}/comparacion-mensual", params={**PERIODO, "formato": "xlsx"})

    textos = {v for fila in _celdas(r) for v in fila if isinstance(v, str)}
    assert "09/26" in textos
    assert "2026-09" not in textos
