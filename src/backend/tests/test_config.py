import os
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from rumbo.core.config import Settings

RAIZ_BACKEND = Path(__file__).resolve().parent.parent


def test_rnf05_settings_lee_database_url_del_entorno(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/x")

    settings = Settings(_env_file=None)

    assert settings.database_url == "postgresql+asyncpg://u:p@localhost:5432/x"


def test_rnf05_settings_sin_database_url_falla_con_mensaje_claro(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None)

    assert "database_url" in str(error.value).lower()


def test_rnf05_la_app_no_arranca_sin_database_url(tmp_path: Path) -> None:
    entorno = {
        k: v for k, v in os.environ.items() if k not in ("DATABASE_URL", "TEST_DATABASE_URL")
    }
    entorno["PYTHONPATH"] = str(RAIZ_BACKEND)

    resultado = subprocess.run(  # noqa: S603
        [sys.executable, "-c", "import rumbo.main"],
        cwd=tmp_path,
        env=entorno,
        capture_output=True,
        text=True,
        check=False,
    )

    assert resultado.returncode != 0
    assert "database_url" in resultado.stderr.lower()
