"""T-068: documento PDF de la cotización (CU-06, RF-021, RNF-16, RF-151).

Los tests del endpoint necesitan WeasyPrint (GTK/Pango): en Windows correrlos dentro del
contenedor de la API. El test de la plantilla solo usa HTML y corre en cualquier lado.
"""

from collections.abc import Awaitable, Callable
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, Cotizacion, Moneda
from rumbo.negocio.documentos.cotizacion import html_cotizacion
from tests.fabricas import ClienteFactory, CotizacionFactory, OportunidadFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


async def _cotizacion(sesion: AsyncSession, responsable_id: UUID) -> Cotizacion:
    cliente = await crear(sesion, ClienteFactory)
    op = await crear(
        sesion, OportunidadFactory, cliente_id=cliente.id, responsable_id=responsable_id
    )
    return await crear(sesion, CotizacionFactory, oportunidad_id=op.id)


def _url(id_: UUID) -> str:
    return f"/api/cotizaciones/{id_}/documento"


async def test_rf021_documento_pdf(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    cot = await _cotizacion(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.get(_url(cot.id))

    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content.startswith(b"%PDF")


async def test_rf021_documento_de_la_propia_para_freelance(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    cot = await _cotizacion(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.get(_url(cot.id))

    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


async def test_rf151_documento_de_cotizacion_ajena_404_para_freelance(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await cliente_como("empleado")
    cot = await _cotizacion(sesion, otro.usuario.id)  # type: ignore[attr-defined]

    r = await c.get(_url(cot.id))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf021_documento_de_cotizacion_inexistente_404(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.get(_url(uuid4()))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


def test_rf021_plantilla_muestra_cliente_detalle_importes_moneda_y_vigencia() -> None:
    cliente = Cliente(nombre="Ana Pérez", contacto="+5491100000000")
    cotizacion = Cotizacion(
        fecha=date(2026, 10, 1),
        moneda=Moneda.ARS,
        items=[
            {"concepto": "Paquete a Bariloche", "precio": "1500000.00"},
            {"concepto": "Seguro de viaje", "precio": "50000.50"},
        ],
        total=Decimal("1550000.50"),
        validez_hasta=date(2026, 11, 1),
    )

    html = html_cotizacion(cotizacion, cliente)

    assert "Ana Pérez" in html
    assert "Paquete a Bariloche" in html
    assert "Seguro de viaje" in html
    assert "1.500.000,00" in html  # importes con el formato local (RNF-16)
    assert "50.000,50" in html
    assert "1.550.000,50" in html  # total
    assert "ARS" in html
    assert "01/10/26" in html  # fechas dd/mm/aa
    assert "01/11/26" in html  # vigencia
    assert "2026-11-01" not in html
