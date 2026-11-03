"""Exportación de los reportes a Excel y PDF (T-124, CU-22, RF-133): el mismo contenido que el
JSON. En el Excel los importes y enteros son celdas numéricas; las fechas, `dd/mm/aa` (RNF-16)."""

import io
from decimal import Decimal
from pathlib import Path
from typing import cast

from jinja2 import Environment, FileSystemLoader, select_autoescape
from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from rumbo.negocio.documentos.formato import fecha, importe, pdf_desde_html
from rumbo.negocio.servicios.reportes import Columna, Fila, Periodo, ReporteGenerado

_entorno = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "plantillas"),
    autoescape=select_autoescape(["html"]),
)
_FORMATO_IMPORTE = "#,##0.00"


def _periodo(periodo: Periodo) -> str:
    return f"{fecha(periodo.desde)} al {fecha(periodo.hasta)}"


def _tablas(reporte: ReporteGenerado) -> list[tuple[str, list[Fila]]]:
    """La tabla del período y, si se pidió comparación, la del período comparado."""
    tablas = [("", reporte.filas)]
    if reporte.comparado is not None and reporte.filas_comparadas is not None:
        tablas.append(
            (f"Período comparado: {_periodo(reporte.comparado)}", reporte.filas_comparadas)
        )
    return tablas


def xlsx_reporte(reporte: ReporteGenerado) -> bytes:
    libro = Workbook()
    hoja = cast(Worksheet, libro.active)  # un libro nuevo siempre trae una hoja
    hoja.title = reporte.definicion.id[:31]
    hoja.append([reporte.definicion.nombre])
    hoja.append(["Período", _periodo(reporte.periodo)])
    columnas = reporte.definicion.columnas
    for titulo, filas in _tablas(reporte):
        hoja.append([])
        if titulo:
            hoja.append([titulo])
        hoja.append([c.titulo for c in columnas])
        for fila in filas:
            hoja.append([_valor(fila.get(c.clave), c) for c in columnas])
            for indice, c in enumerate(columnas, start=1):
                if c.tipo == "importe":
                    hoja.cell(hoja.max_row, indice).number_format = _FORMATO_IMPORTE
    salida = io.BytesIO()
    libro.save(salida)
    return salida.getvalue()


def _valor(valor: str | int | None, columna: Columna) -> str | int | Decimal | None:
    """Los importes llegan como texto (`"1500.50"`): en el Excel van como número."""
    if columna.tipo == "importe" and valor is not None:
        return Decimal(valor)
    return valor


def pdf_reporte(reporte: ReporteGenerado) -> bytes:
    columnas = reporte.definicion.columnas
    return pdf_desde_html(
        _entorno.get_template("reporte.html").render(
            nombre=reporte.definicion.nombre,
            periodo=_periodo(reporte.periodo),
            columnas=columnas,
            tablas=[
                {
                    "titulo": titulo,
                    "filas": [[_celda(f.get(c.clave), c) for c in columnas] for f in filas],
                }
                for titulo, filas in _tablas(reporte)
            ],
        )
    )


def _celda(valor: str | int | None, columna: Columna) -> str:
    if valor is None:
        return ""
    return importe(str(valor)) if columna.tipo == "importe" else str(valor)
