"""Comandos de línea de `rumbo`: `python -m rumbo.presentacion.cli <comando>`."""

import argparse
import asyncio
import json
import os
from collections.abc import Callable
from pathlib import Path

from firebase_admin import exceptions
from google.auth.exceptions import DefaultCredentialsError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core import seguridad
from rumbo.core.config import get_settings
from rumbo.core.db import crear_fabrica_sesiones, crear_motor
from rumbo.core.errores import ErrorDeDominio
from rumbo.core.seguridad import EmuladorFueraDeDesarrollo
from rumbo.datos import semillas
from rumbo.datos.modelos import Usuario
from rumbo.main import crear_app
from rumbo.negocio.servicios.seguridad import asegurar_duena


async def datos_iniciales(
    sesion: AsyncSession,
    *,
    nombre: str,
    email: str,
    crear_cuenta: Callable[[str, str], str],
    demo: bool = False,
    informar: Callable[[str], None] | None = None,
) -> Usuario:
    """Crea la dueña inicial (cuenta de Firebase + `Usuario` dueno), idempotente; con
    `demo` corre las semillas registradas en `rumbo.datos.semillas.SEMILLAS`. `informar`
    recibe el resumen de lo que hizo."""
    duena, creada = await asegurar_duena(
        sesion, nombre=nombre, email=email, crear_cuenta=crear_cuenta
    )
    if informar:
        informar(
            f"Dueña {'creada' if creada else 'ya existía'}: {duena.email} "
            f"(firebase_uid {duena.firebase_uid})."
        )
    if demo:
        for semilla in semillas.SEMILLAS:
            await semilla(sesion)
    return duena


async def _correr_datos_iniciales(url: str, nombre: str, email: str, demo: bool) -> None:
    motor = crear_motor(url)
    try:
        async with crear_fabrica_sesiones(motor)() as sesion:
            await datos_iniciales(
                sesion,
                nombre=nombre,
                email=email,
                crear_cuenta=seguridad.crear_cuenta,
                demo=demo,
                informar=print,
            )
            await sesion.commit()
    finally:
        await motor.dispose()


def exportar_openapi(destino: Path) -> None:
    """Escribe el contrato OpenAPI de la API en `destino` (lo consume `@rumbo/shared`)."""
    documento = crear_app().openapi()
    contenido = json.dumps(documento, indent=2, ensure_ascii=False) + "\n"
    destino.write_text(contenido, encoding="utf-8", newline="\n")


def main(argumentos: list[str] | None = None) -> None:
    analizador = argparse.ArgumentParser(prog="rumbo")
    comandos = analizador.add_subparsers(dest="comando", required=True)
    exportar = comandos.add_parser("exportar-openapi", help="Exporta el contrato OpenAPI")
    exportar.add_argument("destino", type=Path)
    iniciales = comandos.add_parser(
        "datos-iniciales", help="Crea la dueña inicial (Firebase + Usuario) y, con --demo, la demo"
    )
    iniciales.add_argument("--nombre", default=os.environ.get("DUENA_NOMBRE"))
    iniciales.add_argument("--email", default=os.environ.get("DUENA_EMAIL"))
    iniciales.add_argument("--demo", action="store_true", help="Corre las semillas de demo")
    args = analizador.parse_args(argumentos)
    if args.comando == "exportar-openapi":
        exportar_openapi(args.destino)
        return
    faltan = [
        variable
        for variable, valor in (("DUENA_NOMBRE", args.nombre), ("DUENA_EMAIL", args.email))
        if not valor
    ]
    if faltan:
        raise SystemExit(
            f"Falta {' y '.join(faltan)}: pasalos por --nombre/--email o por variables de entorno."
        )
    config = get_settings()
    if not config.firebase_project_id:
        raise SystemExit(
            "Falta FIREBASE_PROJECT_ID: sin él no se puede crear la cuenta de Firebase."
        )
    try:
        asyncio.run(
            _correr_datos_iniciales(config.database_url, args.nombre, args.email, args.demo)
        )
    except (
        exceptions.FirebaseError,
        ValueError,
        DefaultCredentialsError,
        EmuladorFueraDeDesarrollo,
    ) as error:
        raise SystemExit(f"No se pudo crear la cuenta de Firebase: {error}") from error
    except ErrorDeDominio as error:
        raise SystemExit(error.detalle) from error


if __name__ == "__main__":
    main()
