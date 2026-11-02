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


def _fecha_del_proceso(argumentos: list[str]) -> date:
    """`--fecha` (dd/mm/aa) o, sin ella, hoy en Argentina; una fecha inválida sale con error."""
    analizador = argparse.ArgumentParser(prog="rumbo.presentacion.jobs.diario")
    analizador.add_argument(
        "--fecha", type=_fecha, help="Fecha de negocio dd/mm/aa (por defecto, hoy en Argentina)"
    )
    fecha: date | None = analizador.parse_args(argumentos).fecha
    return fecha or fechas.hoy()


async def _correr(fecha: date, fabrica_sesiones: FabricaSesiones) -> int:
    resultados = await proceso_diario.correr(fabrica_sesiones, fecha)
    return 0 if all(r.ok for r in resultados) else 1


async def ejecutar(argumentos: list[str], *, fabrica_sesiones: FabricaSesiones) -> int:
    """Corre el proceso diario y devuelve el código de salida (0 si todos los pasos anduvieron)."""
    return await _correr(_fecha_del_proceso(argumentos), fabrica_sesiones)


async def _correr_con_la_base(fecha: date) -> int:
    motor = crear_motor(get_settings().database_url)
    try:
        return await _correr(fecha, crear_fabrica_sesiones(motor))
    finally:
        await motor.dispose()


def main(argumentos: list[str] | None = None) -> None:
    """Valida la fecha antes de leer la configuración, así su error aparece primero."""
    fecha = _fecha_del_proceso(sys.argv[1:] if argumentos is None else argumentos)
    configurar_logs()
    raise SystemExit(asyncio.run(_correr_con_la_base(fecha)))


if __name__ == "__main__":
    main()
