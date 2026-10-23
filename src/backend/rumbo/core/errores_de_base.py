from asyncpg.exceptions import DataError  # type: ignore[import-untyped]
from sqlalchemy.exc import DBAPIError

SQLSTATE_NUMERO_FUERA_DE_RANGO = "22003"


def es_numero_fuera_de_rango(error: DBAPIError) -> bool:
    """Distingue un número que no entra en la columna de cualquier otro error de la base.

    asyncpg rechaza un entero fuera de rango al codificar el parámetro (`DataError` con
    `OverflowError` de causa); Postgres lo rechaza con SQLSTATE 22003. SQLAlchemy los
    envuelve en un `DBAPIError` genérico, y el original queda en `orig.__cause__`.
    """
    original = error.orig
    if getattr(original, "sqlstate", None) == SQLSTATE_NUMERO_FUERA_DE_RANGO:
        return True
    origen = getattr(original, "__cause__", None)
    return isinstance(origen, DataError) and isinstance(origen.__cause__, OverflowError)
