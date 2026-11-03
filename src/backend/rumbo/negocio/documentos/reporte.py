"""Exportación de los reportes a Excel y PDF (T-124, CU-22, RF-133): el mismo contenido que el
JSON. En el Excel los importes y enteros son celdas numéricas; las fechas, `dd/mm/aa` (RNF-16)."""

import io
from decimal import Decimal
from pathlib import Path
from typing import cast

from jinja2 import Environment, FileSystemLoader, select_autoescape
from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from rumbo.negocio.documentos import formato
from rumbo.negocio.servicios.reportes import (
    Columna,
    Fila,
    Periodo,
    ReporteGenerado,
    es_mes,
    es_porcentaje,
)

_entorno = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "plantillas"),
    autoescape=select_autoescape(["html"]),
)
_FORMATO_IMPORTE = "#,##0.00"
_FORMATO_PORCENTAJE = "0.00"
_INICIOS_DE_FORMULA = ("=", "+", "-", "@", chr(9), chr(13))  # chr(9) es tab y chr(13), CR


def _periodo(periodo: Periodo) -> str:
    return f"{formato.fecha(periodo.desde)} al {formato.fecha(periodo.hasta)}"


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
                celda = hoja.cell(hoja.max_row, indice)
                if c.tipo == "importe":
                    celda.number_format = _FORMATO_IMPORTE
                elif es_porcentaje(c):
                    celda.number_format = _FORMATO_PORCENTAJE
                elif isinstance(celda.value, str) and celda.value.startswith(_INICIOS_DE_FORMULA):
                    # Un dato de texto (p. ej. el nombre de un destino) nunca debe ejecutarse como
                    # fórmula (inyección de fórmulas): se fuerza el tipo texto de la celda.
                    celda.data_type = "s"
    salida = io.BytesIO()
    libro.save(salida)
    return salida.getvalue()


def _valor(valor: str | int | None, columna: Columna) -> str | int | Decimal | None:
    """Los importes y porcentajes llegan como texto (`"1500.50"`): en el Excel van como número."""
    if valor is None:
        return None
    if columna.tipo == "importe" or es_porcentaje(columna):
        return Decimal(valor)
    if es_mes(columna):
        return formato.mes(str(valor))
    return valor


def html_reporte(reporte: ReporteGenerado) -> str:
    columnas = reporte.definicion.columnas
    return _entorno.get_template("reporte.html").render(
        nombre=reporte.definicion.nombre,
        periodo=_periodo(reporte.periodo),
        columnas=[
            {"titulo": c.titulo, "derecha": c.tipo != "texto" or es_porcentaje(c)} for c in columnas
        ],
        tablas=[
            {
                "titulo": titulo,
                "filas": [[_celda(f.get(c.clave), c) for c in columnas] for f in filas],
            }
            for titulo, filas in _tablas(reporte)
        ],
    )


def pdf_reporte(reporte: ReporteGenerado) -> bytes:
    return formato.pdf_desde_html(html_reporte(reporte))


def _celda(valor: str | int | None, columna: Columna) -> str:
    if valor is None:
        return ""
    if columna.tipo == "importe":
        return formato.importe(str(valor))
    if es_porcentaje(columna):
        return f"{formato.importe(str(valor))} %"
    if columna.tipo == "entero":
        return formato.entero(int(valor))
    if es_mes(columna):
        return formato.mes(str(valor))
    return str(valor)
