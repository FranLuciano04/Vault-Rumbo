"""T-124: el HTML del reporte (de donde sale el PDF), verificable sin WeasyPrint. CU-22; RF-133."""

from datetime import date

from rumbo.negocio.documentos.reporte import html_reporte
from rumbo.negocio.servicios.reportes import Periodo, ReporteGenerado, catalogo


def _reporte(reporte_id: str, filas: list, comparadas: list | None = None) -> ReporteGenerado:
    definicion = next(d for d in catalogo() if d.id == reporte_id)
    comparado = Periodo(date(2026, 8, 1), date(2026, 8, 31)) if comparadas is not None else None
    return ReporteGenerado(
        definicion, Periodo(date(2026, 9, 1), date(2026, 9, 30)), comparado, filas, comparadas
    )


def test_rf133_html_lleva_encabezados_importes_y_periodo_en_formato_local() -> None:
    html = html_reporte(
        _reporte("ventas", [{"viajes": 1500, "ventas_ars": "1000000.00", "ventas_usd": "0.00"}])
    )

    for titulo in ("Ventas del período", "Viajes", "Ventas (ARS)", "Ventas (USD)"):
        assert titulo in html
    assert "1.000.000,00" in html
    assert "1.500" in html  # entero con separador de miles
    assert "01/09/26 al 30/09/26" in html
    assert "2026-09-01" not in html


def test_rf133_html_incluye_la_tabla_del_periodo_comparado() -> None:
    html = html_reporte(
        _reporte(
            "ventas",
            [{"viajes": 1, "ventas_ars": "1000000.00", "ventas_usd": "0.00"}],
            [{"viajes": 2, "ventas_ars": "250000.00", "ventas_usd": "0.00"}],
        )
    )

    assert "Período comparado: 01/08/26 al 31/08/26" in html
    assert "250.000,00" in html


def test_rf133_html_escapa_el_texto_de_los_datos() -> None:
    fila = {
        "destino": "<b>x</b>",
        "viajes": 1,
        "pasajeros": 1,
        "ventas_ars": "1.00",
        "ventas_usd": "0",
    }

    html = html_reporte(_reporte("ventas-por-destino", [fila]))

    assert "<b>x</b>" not in html
    assert "&lt;b&gt;x&lt;/b&gt;" in html


def test_rf133_html_muestra_el_margen_y_el_mes_en_formato_local() -> None:
    margen = html_reporte(
        _reporte(
            "ganancia",
            [
                {
                    "ganancia_ars": "1.00",
                    "ganancia_usd": "0",
                    "margen_ars": "12.50",
                    "margen_usd": "0.00",
                }
            ],
        )
    )
    mes = html_reporte(
        _reporte(
            "comparacion-mensual", [{"mes": "2026-05", "ventas_ars": "1.00", "ventas_usd": "0"}]
        )
    )

    assert "12,50 %" in margen
    assert "05/26" in mes
    assert "2026-05" not in mes


def test_rf135_html_sin_filas_avisa_que_no_hay_datos() -> None:
    html = html_reporte(_reporte("ventas", []))

    assert "Sin datos en el período" in html
