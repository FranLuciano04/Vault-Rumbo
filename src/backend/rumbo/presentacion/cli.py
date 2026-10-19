"""Comandos de línea de `rumbo`: `python -m rumbo.presentacion.cli <comando>`."""

import argparse
import json
from pathlib import Path
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.config import get_settings
from rumbo.datos.modelos import Usuario
from rumbo.main import crear_app

__all__ = ["get_settings"]  # stub T-017: los tests lo reemplazan por monkeypatch


class CreadorDeCuentas(Protocol):
    """Crea (o devuelve, si ya existe) la cuenta de Firebase de un email y da su uid."""

    def __call__(self, email: str, nombre: str) -> str: ...


async def datos_iniciales(
    sesion: AsyncSession,
    *,
    nombre: str,
    email: str,
    crear_cuenta: CreadorDeCuentas,
    demo: bool = False,
) -> Usuario:
    """Crea la dueña inicial (cuenta de Firebase + `Usuario` dueno), idempotente; con
    `demo` corre las semillas registradas en `rumbo.datos.semillas.SEMILLAS`."""
    raise NotImplementedError


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
