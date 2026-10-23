from sqlalchemy.exc import DBAPIError

from rumbo.core.errores_de_base import es_numero_fuera_de_rango


class _Original(Exception):
    def __init__(self, sqlstate: str | None = None) -> None:
        super().__init__("original")
        self.sqlstate = sqlstate


def _envolver(original: Exception) -> DBAPIError:
    return DBAPIError("SELECT 1", None, original)


def test_rnf12_sqlstate_22003_es_numero_fuera_de_rango() -> None:
    assert es_numero_fuera_de_rango(_envolver(_Original("22003")))


def test_rnf12_otro_sqlstate_no_es_numero_fuera_de_rango() -> None:
    assert not es_numero_fuera_de_rango(_envolver(_Original("23505")))


def test_rnf12_data_error_de_asyncpg_por_overflow_es_numero_fuera_de_rango() -> None:
    from asyncpg.exceptions import DataError

    origen = DataError("invalid input")
    origen.__cause__ = OverflowError("value out of int32 range")
    original = _Original()
    original.__cause__ = origen

    assert es_numero_fuera_de_rango(_envolver(original))


def test_rnf12_data_error_de_asyncpg_sin_overflow_no_es_numero_fuera_de_rango() -> None:
    from asyncpg.exceptions import DataError

    origen = DataError("invalid input")
    origen.__cause__ = TypeError("otro")
    original = _Original()
    original.__cause__ = origen

    assert not es_numero_fuera_de_rango(_envolver(original))
