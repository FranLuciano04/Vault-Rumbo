from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_PREFIJO_DRIVER = "postgresql+asyncpg://"


class Settings(BaseSettings):
    """Configuración de la app, tomada del entorno (o de .env en desarrollo)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # Cerrado por defecto: solo `desarrollo` admite el Auth Emulator (ver
    # `core.seguridad.emulador_configurado`). En el servidor va `produccion` o se omite.
    entorno: Literal["desarrollo", "produccion"] = "produccion"
    # DEC-0016: sin `firebase_project_id` cada pedido autenticado responde 502
    # (`ServicioExterno`) y se loguea qué falta; el resto de la API arranca igual (los tests
    # no usan Firebase).
    firebase_project_id: str | None = None
    google_application_credentials: str | None = None
    firebase_auth_emulator_host: str | None = None
    # DEC-0012 / RNF-16: por defecto el modelo falso; `claude` exige `anthropic_api_key`.
    ia_modelo: Literal["falso", "claude"] = "falso"
    anthropic_api_key: SecretStr | None = None

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
