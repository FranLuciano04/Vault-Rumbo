"""Exportación de un reporte generado a Excel o PDF (CU-22, RF-133)."""

import asyncio
from typing import Literal, NamedTuple

from rumbo.negocio.documentos.reporte import pdf_reporte, xlsx_reporte
from rumbo.negocio.servicios.reportes import ReporteGenerado


class Archivo(NamedTuple):
    nombre: str
    tipo_contenido: str
    contenido: bytes


async def exportar_reporte(reporte: ReporteGenerado, formato: Literal["xlsx", "pdf"]) -> Archivo:
    """El archivo se genera en un hilo: WeasyPrint y openpyxl son síncronos y pesados."""
    nombre = (
        f"{reporte.definicion.id}-{reporte.periodo.desde:%Y%m%d}-{reporte.periodo.hasta:%Y%m%d}"
    )
    if formato == "xlsx":
        contenido = await asyncio.to_thread(xlsx_reporte, reporte)
        return Archivo(f"{nombre}.xlsx", XLSX, contenido)
    return Archivo(
        f"{nombre}.pdf", "application/pdf", await asyncio.to_thread(pdf_reporte, reporte)
    )


XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
