"""Formato local (RNF-16) y paso de HTML a PDF, compartidos por los documentos."""

from datetime import date
from decimal import Decimal
from typing import Any


def fecha(dia: date) -> str:
    return dia.strftime("%d/%m/%y")


def importe(valor: Decimal | str) -> str:
    """`1500000.5` → `1.500.000,50`."""
    return f"{Decimal(valor):,.2f}".replace(",", "\0").replace(".", ",").replace("\0", ".")


def entero(valor: int) -> str:
    """`1500` → `1.500`."""
    return f"{valor:,}".replace(",", ".")


def mes(valor: str) -> str:
    """`2026-05` → `05/26`."""
    anio, numero = valor.split("-")
    return f"{numero}/{anio[-2:]}"


def _sin_recursos_externos(url: str) -> dict[str, Any]:
    """Las plantillas no usan ningún recurso externo: si aparece uno, se rechaza (defensa en
    profundidad contra SSRF si se perdiera el autoescape)."""
    raise ValueError(f"Recurso externo no permitido en el documento: {url}")


def pdf_desde_html(html: str) -> bytes:
    # Import diferido: WeasyPrint necesita Pango del sistema y falla al importar si falta
    # (p. ej. en Windows); así el resto de la API y las plantillas no dependen de él.
    from weasyprint import HTML

    pdf: bytes = HTML(string=html, url_fetcher=_sin_recursos_externos).write_pdf()
    return pdf
