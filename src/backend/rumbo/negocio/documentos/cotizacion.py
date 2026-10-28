"""Documento PDF de la cotización (T-068, CU-06, RF-021): HTML desde una plantilla versionada y
WeasyPrint lo pasa a PDF. Importes y fechas con el formato local (RNF-16)."""

from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from rumbo.datos.modelos import Cliente, Cotizacion

_entorno = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "plantillas"),
    autoescape=select_autoescape(["html"]),
)


def _fecha(dia: date) -> str:
    return dia.strftime("%d/%m/%y")


def _importe(valor: Decimal | str) -> str:
    """`1500000.5` → `1.500.000,50`."""
    return f"{Decimal(valor):,.2f}".replace(",", "\0").replace(".", ",").replace("\0", ".")


def html_cotizacion(cotizacion: Cotizacion, cliente: Cliente) -> str:
    return _entorno.get_template("cotizacion.html").render(
        cliente=cliente,
        fecha=_fecha(cotizacion.fecha),
        moneda=cotizacion.moneda.value,
        items=[
            {"concepto": i["concepto"], "precio": _importe(i["precio"])} for i in cotizacion.items
        ],
        total=_importe(cotizacion.total),
        validez_hasta=_fecha(cotizacion.validez_hasta),
    )


def _sin_recursos_externos(url: str) -> dict[str, Any]:
    """La plantilla no usa ningún recurso externo: si aparece uno, se rechaza (defensa en
    profundidad contra SSRF si se perdiera el autoescape)."""
    raise ValueError(f"Recurso externo no permitido en el documento: {url}")


def pdf_cotizacion(cotizacion: Cotizacion, cliente: Cliente) -> bytes:
    # Import diferido: WeasyPrint necesita Pango del sistema y falla al importar si falta
    # (p. ej. en Windows); así el resto de la API y la plantilla no dependen de él.
    from weasyprint import HTML

    pdf: bytes = HTML(
        string=html_cotizacion(cotizacion, cliente), url_fetcher=_sin_recursos_externos
    ).write_pdf()
    return pdf
