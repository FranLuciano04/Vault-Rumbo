"""T-008: la migración inicial de Alembic reproduce `rumbo.sql` y coincide con los modelos.

Cada test trabaja sobre una base vacía propia (`rumbo_migracion_<id>`) creada en el servidor
de tests, para poder hacer upgrade/downgrade sin tocar la base compartida. Alembic corre
como subproceso con `DATABASE_URL` apuntando a esa base (contrato para `alembic/env.py`).
Requisitos: DEC-0015, DEC-0013, DEC-0016, RNF-07.
"""

import importlib.util
import re
import uuid
from collections.abc import AsyncIterator
from typing import Any

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Enum, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import NullPool

from rumbo.datos import modelos as m
from tests.conftest import RAIZ_BACKEND, correr_alembic

TABLAS = {
    "usuario",
    "configuracion",
    "destino",
    "requisito_destino",
    "operador",
    "hotel",
    "cliente",
    "oportunidad",
    "cotizacion",
    "viaje",
    "pago",
    "viaje_hotel",
    "resena",
    "alerta",
    "contenido_red",
}


@pytest.fixture
async def url_vacia(url_tests: str) -> AsyncIterator[str]:
    """URL de una base recién creada y vacía; se elimina al terminar."""
    nombre = f"rumbo_migracion_{uuid.uuid4().hex[:8]}"
    base = make_url(url_tests)
    admin = create_async_engine(
        base.set(database="postgres"), poolclass=NullPool, isolation_level="AUTOCOMMIT"
    )
    async with admin.connect() as c:
        await c.execute(text(f'CREATE DATABASE "{nombre}"'))
    try:
        yield base.set(database=nombre).render_as_string(hide_password=False)
    finally:
        async with admin.connect() as c:
            await c.execute(text(f'DROP DATABASE IF EXISTS "{nombre}" WITH (FORCE)'))
        await admin.dispose()


async def _consultar(url: str, sql: str) -> list[Any]:
    motor = create_async_engine(url, poolclass=NullPool)
    try:
        async with motor.connect() as c:
            return list((await c.execute(text(sql))).all())
    finally:
        await motor.dispose()


async def _tablas(url: str) -> set[str]:
    filas = await _consultar(
        url,
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' "
        "AND tablename <> 'alembic_version'",
    )
    return {f[0] for f in filas}


async def _tipos_enum(url: str) -> dict[str, list[str]]:
    filas = await _consultar(
        url,
        "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid "
        "JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' "
        "ORDER BY t.typname, e.enumsortorder",
    )
    resultado: dict[str, list[str]] = {}
    for nombre, etiqueta in filas:
        resultado.setdefault(nombre, []).append(etiqueta)
    return resultado


def _upgrade(url: str) -> None:
    r = correr_alembic(url, "upgrade", "head")
    assert r.returncode == 0, r.stdout + r.stderr


# --- Criterio 1: upgrade head / downgrade base -----------------------------------------------


def test_rnf07_existe_la_configuracion_de_alembic() -> None:
    assert (RAIZ_BACKEND / "alembic.ini").is_file()
    assert (RAIZ_BACKEND / "alembic" / "env.py").is_file()
    assert list((RAIZ_BACKEND / "alembic" / "versions").glob("0001_*.py"))


async def test_rnf07_upgrade_head_en_base_vacia_crea_las_15_tablas(url_vacia: str) -> None:
    assert await _tablas(url_vacia) == set()
    _upgrade(url_vacia)
    assert await _tablas(url_vacia) == TABLAS


async def test_rnf07_upgrade_head_crea_los_20_enums_con_sus_valores(url_vacia: str) -> None:
    _upgrade(url_vacia)
    esperado = {
        e.name: list(e.enums)
        for tabla in m.Base.metadata.tables.values()
        for col in tabla.columns
        if isinstance(e := col.type, Enum)
    }
    assert len(esperado) == 20
    assert await _tipos_enum(url_vacia) == esperado


async def test_rnf07_downgrade_base_borra_tablas_y_enums(url_vacia: str) -> None:
    _upgrade(url_vacia)
    r = correr_alembic(url_vacia, "downgrade", "base")
    assert r.returncode == 0, r.stdout + r.stderr
    assert await _tablas(url_vacia) == set()
    assert await _tipos_enum(url_vacia) == {}


async def test_rnf07_upgrade_downgrade_upgrade_es_repetible(url_vacia: str) -> None:
    _upgrade(url_vacia)
    assert correr_alembic(url_vacia, "downgrade", "base").returncode == 0
    _upgrade(url_vacia)
    assert await _tablas(url_vacia) == TABLAS


# --- Criterio 2: modelos == base migrada ------------------------------------------------------


async def test_rnf07_columnas_de_la_base_migrada_coinciden_con_los_modelos(
    url_vacia: str,
) -> None:
    _upgrade(url_vacia)
    filas = await _consultar(
        url_vacia,
        "SELECT table_name, column_name, is_nullable FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name <> 'alembic_version'",
    )
    real = {(t, c): n == "YES" for t, c, n in filas}
    esperado = {
        (tabla.name, col.name): bool(col.nullable)
        for tabla in m.Base.metadata.tables.values()
        for col in tabla.columns
    }
    assert real == esperado


async def test_rnf07_alembic_check_no_detecta_diferencias_con_los_modelos(
    url_vacia: str,
) -> None:
    _upgrade(url_vacia)
    r = correr_alembic(url_vacia, "check")
    assert r.returncode == 0, r.stdout + r.stderr


async def test_rnf07_compare_metadata_no_encuentra_diferencias(url_vacia: str) -> None:
    _upgrade(url_vacia)
    motor: AsyncEngine = create_async_engine(url_vacia, poolclass=NullPool)
    try:
        async with motor.connect() as c:

            def comparar(sync_conn: Any) -> list[Any]:
                contexto = MigrationContext.configure(
                    sync_conn, opts={"compare_type": True, "compare_server_default": True}
                )
                return compare_metadata(contexto, m.Base.metadata)

            diferencias = await c.run_sync(comparar)
    finally:
        await motor.dispose()
    assert diferencias == []


# --- Fila inicial de configuracion ------------------------------------------------------------


async def test_dec0013_configuracion_tiene_una_fila_con_los_defaults_de_rumbo_sql(
    url_vacia: str,
) -> None:
    _upgrade(url_vacia)
    filas = await _consultar(
        url_vacia,
        "SELECT id, vigencia_cotizacion_meses, anticipacion_salida_dias, recontacto_meses, "
        "created_by, updated_by, created_at IS NOT NULL, updated_at IS NOT NULL "
        "FROM configuracion",
    )
    assert [tuple(f) for f in filas] == [(1, 1, 7, 6, None, None, True, True)]


async def test_rnf07_configuracion_rechaza_una_segunda_fila(url_vacia: str) -> None:
    _upgrade(url_vacia)
    motor = create_async_engine(url_vacia, poolclass=NullPool)
    try:
        async with motor.connect() as c:
            with pytest.raises(Exception, match="configuracion"):
                await c.execute(text("INSERT INTO configuracion (id) VALUES (2)"))
    finally:
        await motor.dispose()


# --- Criterio 3: el conftest usa la migración -------------------------------------------------


async def test_rnf07_la_base_de_tests_fue_preparada_por_alembic(motor: AsyncEngine) -> None:
    async with motor.connect() as c:
        version = (await c.execute(text("SELECT version_num FROM alembic_version"))).all()
        n = (await c.execute(text("SELECT count(*) FROM configuracion"))).scalar_one()
    assert len(version) == 1
    assert n == 1


# --- La migración reproduce rumbo.sql sin desvíos ---------------------------------------------


def _sentencias(sql: str) -> list[str]:
    sin_comentarios = re.sub(r"--[^\n]*", "", sql)
    crudas = (re.sub(r"\s+", " ", s).strip() for s in sin_comentarios.split(";"))
    return [s for s in crudas if s and s not in {"BEGIN", "COMMIT"}]


def test_rnf07_la_migracion_inicial_reproduce_las_sentencias_de_rumbo_sql() -> None:
    ruta = next((RAIZ_BACKEND / "alembic" / "versions").glob("0001_*.py"))
    spec = importlib.util.spec_from_file_location("migracion_0001", ruta)
    assert spec is not None and spec.loader is not None
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    rumbo_sql = RAIZ_BACKEND.parent.parent / "05-Diseño" / "Datos" / "rumbo.sql"
    assert _sentencias("; ".join(modulo._SENTENCIAS)) == _sentencias(
        rumbo_sql.read_text(encoding="utf-8")
    )


# --- 0005: relleno de la clave canónica del contacto ------------------------------------------


async def test_rf003_la_migracion_0005_rellena_la_clave_de_los_clientes_existentes(
    url_vacia: str,
) -> None:
    assert correr_alembic(url_vacia, "upgrade", "0004").returncode == 0
    motor = create_async_engine(url_vacia, poolclass=NullPool)
    try:
        async with motor.begin() as c:
            for contacto in ("011 15-5555-1234", "Ana@Mail.Test", "sin dato"):
                await c.execute(
                    text(
                        "INSERT INTO cliente (id, nombre, contacto, segmento) "
                        "VALUES (gen_random_uuid(), 'X', :contacto, 'familia')"
                    ),
                    {"contacto": contacto},
                )
    finally:
        await motor.dispose()

    _upgrade(url_vacia)

    filas = await _consultar(url_vacia, "SELECT contacto, contacto_clave FROM cliente")
    assert dict(filas) == {
        "011 15-5555-1234": "5491155551234",
        "Ana@Mail.Test": "ana@mail.test",
        "sin dato": "sin dato",
    }
