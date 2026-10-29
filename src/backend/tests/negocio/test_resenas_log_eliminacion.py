"""Fix de review M5 / H-02: la eliminación física de una reseña deja una línea de log efectiva.

Contrato del punto de entrada que los tests fijan (lo sigue el implementador):

- Existe `rumbo.core.logs.configurar_logs() -> None`. Es idempotente (llamarla dos veces no duplica
  handlers) y es la configuración que usa el arranque real.
- Deja el logger `rumbo` en nivel INFO y le agrega un handler que escribe en la salida estándar.
  El handler tiene que resolver `sys.stdout` al llamar a `configurar_logs()` (no al importar el
  módulo), para que `capsys` lo vea.
- El formato imprime, en el texto, el mensaje y los campos `extra` del registro: `resena_id`,
  `hotel_id`, `cliente_id`, `puntaje`, `motivo_baja` y `actor_id`, cada uno como `campo=valor`
  (o `campo: valor`; los tests solo exigen que aparezcan el nombre del campo y su valor).
- `rumbo.main` importa `configurar_logs` (`from rumbo.core.logs import configurar_logs`) y
  `crear_app()` la llama.
- `eliminar_resena` loguea con el logger `rumbo.negocio.servicios.resenas` después del `flush`
  de la eliminación, con el mensaje que contiene «eliminada».

Los tests no usan `caplog.at_level`: parten del logger `rumbo` sin configurar (como en el arranque
del contenedor) y miden lo que sale por la salida estándar tras `configurar_logs()`.
"""

import logging
from collections.abc import Iterator
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.negocio.errores import Conflicto
from rumbo.negocio.servicios import resenas
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    HotelFactory,
    ResenaFactory,
    UsuarioFactory,
    crear,
)


@pytest.fixture
def logs_de_arranque() -> Iterator[Any]:
    """Aplica la configuración de logging del arranque y restaura el logger `rumbo` al terminar."""
    logger = logging.getLogger("rumbo")
    handlers, nivel, propaga = list(logger.handlers), logger.level, logger.propagate
    logger.handlers.clear()
    logger.setLevel(logging.NOTSET)  # sin configurar: hereda WARNING del raíz, como el contenedor
    try:
        from rumbo.core.logs import configurar_logs  # noqa: PLC0415 (falla por el import hoy)

        configurar_logs()
        yield configurar_logs
    finally:
        logger.handlers[:] = handlers
        logger.setLevel(nivel)
        logger.propagate = propaga


async def _oculta(sesion: AsyncSession, **campos: Any) -> Any:
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    cliente = await crear(sesion, ClienteFactory)
    return await crear(sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, **campos)


def test_cu29_a2_crear_app_aplica_la_configuracion_de_logs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """El arranque real llama a `configurar_logs()`."""
    from rumbo import main  # noqa: PLC0415

    llamadas: list[int] = []
    monkeypatch.setattr(main, "configurar_logs", lambda: llamadas.append(1))
    main.crear_app()
    assert llamadas == [1]


def test_cu29_a2_configurar_logs_es_idempotente(logs_de_arranque: Any) -> None:
    logger = logging.getLogger("rumbo")
    cantidad = len(logger.handlers)
    logs_de_arranque()
    assert len(logger.handlers) == cantidad


async def test_cu29_a2_la_linea_de_eliminacion_sale_por_stdout_con_los_campos(
    sesion: AsyncSession, logs_de_arranque: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    """Con la configuración de arranque (sin forzar el nivel) la línea sale por stdout."""
    admin = await crear(sesion, UsuarioFactory, rol="admin")
    resena = await _oculta(sesion, puntaje=2, estado="oculta", motivo_baja="Spam")
    capsys.readouterr()  # descarta lo emitido por la preparación

    await resenas.eliminar_resena(sesion, admin, resena.id)

    salida = capsys.readouterr().out
    assert "eliminada" in salida
    for campo, valor in {
        "resena_id": str(resena.id),
        "hotel_id": str(resena.hotel_id),
        "cliente_id": str(resena.cliente_id),
        "puntaje": "2",
        "motivo_baja": "Spam",
        "actor_id": str(admin.id),
    }.items():
        assert campo in salida
        assert valor in salida


async def test_cu29_a2_si_el_flush_falla_no_hay_linea_de_eliminada(
    sesion: AsyncSession,
    logs_de_arranque: Any,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin = await crear(sesion, UsuarioFactory, rol="admin")
    resena = await _oculta(sesion, estado="oculta", motivo_baja="Spam")
    capsys.readouterr()

    async def flush_roto(*_args: Any, **_kwargs: Any) -> None:
        raise RuntimeError("falla de base")

    monkeypatch.setattr(sesion, "flush", flush_roto)
    with pytest.raises(RuntimeError):
        await resenas.eliminar_resena(sesion, admin, resena.id)

    assert "eliminada" not in capsys.readouterr().out


async def test_cu29_a2_eliminar_una_publicada_409_no_deja_la_linea(
    sesion: AsyncSession, logs_de_arranque: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    admin = await crear(sesion, UsuarioFactory, rol="admin")
    resena = await _oculta(sesion, estado="publicada")
    capsys.readouterr()

    with pytest.raises(Conflicto):
        await resenas.eliminar_resena(sesion, admin, resena.id)

    assert "eliminada" not in capsys.readouterr().out
