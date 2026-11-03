"""Documento PDF de la cotización (T-068, CU-06, RF-021): HTML desde una plantilla versionada y
WeasyPrint lo pasa a PDF. Importes y fechas con el formato local (RNF-16)."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from rumbo.datos.modelos import Cliente, Cotizacion
from rumbo.negocio.documentos.formato import fecha, importe, pdf_desde_html

_entorno = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "plantillas"),
    autoescape=select_autoescape(["html"]),
)


def html_cotizacion(cotizacion: Cotizacion, cliente: Cliente) -> str:
    return _entorno.get_template("cotizacion.html").render(
        cliente=cliente,
        fecha=fecha(cotizacion.fecha),
        moneda=cotizacion.moneda.value,
        items=[
            {"concepto": i["concepto"], "precio": importe(i["precio"])} for i in cotizacion.items
        ],
        total=importe(cotizacion.total),
        validez_hasta=fecha(cotizacion.validez_hasta),
    )


def pdf_cotizacion(cotizacion: Cotizacion, cliente: Cliente) -> bytes:
    return pdf_desde_html(html_cotizacion(cotizacion, cliente))
