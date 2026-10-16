"""Comandos de línea de `rumbo`: `python -m rumbo.presentacion.cli <comando>`."""

import argparse
import json
from pathlib import Path

from rumbo.main import crear_app


def exportar_openapi(destino: Path) -> None:
    """Escribe el contrato OpenAPI de la API en `destino` (lo consume `@rumbo/shared`)."""
    documento = crear_app().openapi()
    destino.write_text(json.dumps(documento, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argumentos: list[str] | None = None) -> None:
    analizador = argparse.ArgumentParser(prog="rumbo")
    comandos = analizador.add_subparsers(dest="comando", required=True)
    exportar = comandos.add_parser("exportar-openapi", help="Exporta el contrato OpenAPI")
    exportar.add_argument("destino", type=Path)
    args = analizador.parse_args(argumentos)
    exportar_openapi(args.destino)


if __name__ == "__main__":
    main()
