from typing import Any


class Settings:
    """Stub T-006: la implementación real es un BaseSettings con `database_url`."""

    database_url: str

    def __init__(self, **datos: Any) -> None:
        raise NotImplementedError
