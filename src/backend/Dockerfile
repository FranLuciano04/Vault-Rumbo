# Imagen de la API (y del scheduler). Contexto: src/backend. DEC-0011, DEC-0015 §7.
# No lleva secretos: la configuración entra por variables de entorno (src/.env vía Compose).
FROM python:3.13-slim

# Pango y fuentes: WeasyPrint los necesita para generar los PDF (cotizaciones, reportes).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
WORKDIR /app

# Dependencias primero: esta capa se reutiliza mientras no cambie uv.lock.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY alembic ./alembic
COPY rumbo ./rumbo
ENV PATH="/app/.venv/bin:$PATH"

RUN useradd --system --no-create-home rumbo
USER rumbo
EXPOSE 8000

# Migra y levanta la API (criterio de T-024: las migraciones corren al arrancar).
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn rumbo.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
