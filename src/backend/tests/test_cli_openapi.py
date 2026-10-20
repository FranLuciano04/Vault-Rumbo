"""T-144: `rumbo exportar-openapi` escribe `openapi.json` con finales de línea LF."""

import json
from pathlib import Path

from rumbo.main import crear_app
from rumbo.presentacion import cli


def test_rf_t144_openapi_exportado_sin_crlf_y_con_un_unico_lf_final(tmp_path: Path) -> None:
    destino = tmp_path / "openapi.json"

    cli.exportar_openapi(destino)

    crudo = destino.read_bytes()
    assert b"\r\n" not in crudo
    assert crudo.endswith(b"}\n")
    assert not crudo.endswith(b"\n\n")


def test_rf_t144_openapi_exportado_conserva_el_documento_y_la_indentacion(tmp_path: Path) -> None:
    destino = tmp_path / "openapi.json"

    cli.exportar_openapi(destino)

    esperado = json.dumps(crear_app().openapi(), indent=2, ensure_ascii=False) + "\n"
    assert destino.read_bytes() == esperado.encode("utf-8")
