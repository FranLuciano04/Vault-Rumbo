"""Documento PDF de la cotización (T-068, CU-06, RF-021). Stub: lo implementa el verde."""

from rumbo.datos.modelos import Cliente, Cotizacion


def html_cotizacion(cotizacion: Cotizacion, cliente: Cliente) -> str:
    raise NotImplementedError


def pdf_cotizacion(cotizacion: Cotizacion, cliente: Cliente) -> bytes:
    raise NotImplementedError
