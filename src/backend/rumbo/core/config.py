from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_PREFIJO_DRIVER = "postgresql+asyncpg://"


class Settings(BaseSettings):
    """Configuración de la app, tomada del entorno (o de .env en desarrollo)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # DEC-0016: sin `firebase_project_id` la verificación de tokens falla (500) en el primer
    # pedido autenticado; el resto de la API arranca igual (los tests no usan Firebase).
    firebase_project_id: str | None = None
    google_application_credentials: str | None = None
    firebase_auth_emulator_host: str | None = None

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
