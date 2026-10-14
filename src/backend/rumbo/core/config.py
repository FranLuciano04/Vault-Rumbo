from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_PREFIJO_DRIVER = "postgresql+asyncpg://"


class Settings(BaseSettings):
    """Configuración de la app, tomada del entorno (o de .env en desarrollo)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    @field_validator("database_url")
    @classmethod
    def _driver_asyncpg(cls, valor: str) -> str:
        if not valor.startswith(_PREFIJO_DRIVER):
            raise ValueError(
                f"database_url debe usar el driver async: empezar con '{_PREFIJO_DRIVER}'"
            )
        return valor


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
