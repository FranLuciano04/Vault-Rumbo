"""Punto de entrada del proceso automático diario (lo corre el scheduler a las 00:00):
`python -m rumbo.presentacion.jobs.diario [--fecha dd/mm/aa]`.

Sin `--fecha` usa el día de hoy en Argentina. Sale con código 1 si algún paso falló.
"""

import argparse
import asyncio
import sys
from datetime import date, datetime

from rumbo.core import fechas
from rumbo.core.config import get_settings
from rumbo.core.db import crear_fabrica_sesiones, crear_motor
from rumbo.core.logs import configurar_logs
from rumbo.negocio.servicios import proceso_diario
from rumbo.negocio.servicios.proceso_diario import FabricaSesiones


def _fecha(texto: str) -> date:
    try:
        return datetime.strptime(texto, "%d/%m/%y").date()
    except ValueError as error:
        raise argparse.ArgumentTypeError(f"fecha inválida {texto!r}: se espera dd/mm/aa") from error


async def ejecutar(argumentos: list[str], *, fabrica_sesiones: FabricaSesiones) -> int:
    """Corre el proceso diario y devuelve el código de salida (0 si todos los pasos anduvieron)."""
    analizador = argparse.ArgumentParser(prog="rumbo.presentacion.jobs.diario")
    analizador.add_argument(
        "--fecha", type=_fecha, help="Fecha de negocio dd/mm/aa (por defecto, hoy en Argentina)"
    )
    args = analizador.parse_args(argumentos)
    fecha = args.fecha or fechas.hoy()
    resultados = await proceso_diario.correr(fabrica_sesiones, fecha)
    return 0 if all(r.ok for r in resultados) else 1


async def _ejecutar_con_la_base(argumentos: list[str]) -> int:
    motor = crear_motor(get_settings().database_url)
    try:
        return await ejecutar(argumentos, fabrica_sesiones=crear_fabrica_sesiones(motor))
    finally:
        await motor.dispose()


def main(argumentos: list[str] | None = None) -> None:
    configurar_logs()
    raise SystemExit(
        asyncio.run(_ejecutar_con_la_base(sys.argv[1:] if argumentos is None else argumentos))
    )


if __name__ == "__main__":
    main()
