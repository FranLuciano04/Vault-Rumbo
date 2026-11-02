"""T-110: proceso diario idempotente (`jobs.diario`, RNF-05, RNF-13).

Contrato supuesto (a confirmar en la review):
- `rumbo.negocio.servicios.proceso_diario`:
  - `Paso(nombre: str, ejecutar: Callable[[AsyncSession, date], Awaitable[str | None]])`;
    `ejecutar` devuelve un texto opcional con lo que hizo.
  - `PASOS: list[Paso]`: registro de pasos (vacío hasta los tickets siguientes).
  - `async correr(fabrica_sesiones, fecha: date, pasos: Sequence[Paso] | None = None)
    -> list[ResultadoPaso]`; `ResultadoPaso` tiene `nombre`, `ok: bool`, `detalle: str | None`.
    Cada paso corre con una sesión propia de `fabrica_sesiones()` y la confirma (commit) si
    anduvo; si lanza, hace rollback, lo registra y sigue con el próximo. `pasos=None` usa `PASOS`.
- `rumbo.presentacion.jobs.diario`:
  - `async ejecutar(argumentos: list[str], *, fabrica_sesiones) -> int`: código de salida
    (0 todo bien, 1 si algún paso falló). `--fecha dd/mm/aa`; sin ella, `fechas.hoy()` (llamado
    como `rumbo.core.fechas.hoy`, hora de Argentina). Fecha inválida: `SystemExit` distinto de 0.
  - `main()` arma motor y fábrica reales y sale con ese código (`python -m ...diario`).
- La fábrica de tests devuelve la sesión de test (revierte siempre).
"""

import logging
from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core import fechas
from rumbo.core.seguridad import usuario_auditoria
from rumbo.datos import modelos as m
from rumbo.negocio.servicios import proceso_diario
from rumbo.negocio.servicios.proceso_diario import Paso
from rumbo.presentacion.jobs import diario
from tests.fabricas import DestinoFactory, crear

HOY = date(2026, 11, 2)


class _Contexto:
    def __init__(self, sesion: AsyncSession) -> None:
        self.sesion = sesion

    async def __aenter__(self) -> AsyncSession:
        return self.sesion

    async def __aexit__(self, *_: object) -> None:
        return None


def _fabrica(sesion: AsyncSession):  # noqa: ANN202
    return lambda: _Contexto(sesion)


async def _contar_destinos(sesion: AsyncSession) -> int:
    return await sesion.scalar(select(func.count()).select_from(m.Destino)) or 0


def _paso_que_crea_destino(nombre_paso: str, nombre_destino: str) -> Paso:
    """Paso idempotente: crea el destino solo si no existe."""

    async def ejecutar(sesion: AsyncSession, fecha: date) -> str:
        existe = await sesion.scalar(select(m.Destino).where(m.Destino.nombre == nombre_destino))
        if existe is None:
            await crear(sesion, DestinoFactory, nombre=nombre_destino)
            return "creó el destino"
        return "nada para hacer"

    return Paso(nombre=nombre_paso, ejecutar=ejecutar)


async def test_rnf05_corre_todos_los_pasos_con_la_fecha_indicada(sesion: AsyncSession) -> None:
    vistas: list[tuple[str, date]] = []

    def _paso(nombre: str) -> Paso:
        async def ejecutar(sesion: AsyncSession, fecha: date) -> None:
            vistas.append((nombre, fecha))

        return Paso(nombre=nombre, ejecutar=ejecutar)

    resultados = await proceso_diario.correr(
        _fabrica(sesion), HOY, [_paso("uno"), _paso("dos"), _paso("tres")]
    )

    assert vistas == [("uno", HOY), ("dos", HOY), ("tres", HOY)]
    assert [r.nombre for r in resultados] == ["uno", "dos", "tres"]
    assert all(r.ok for r in resultados)


async def test_rnf05_sin_pasos_explicitos_usa_el_registro(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    vistas: list[date] = []

    async def ejecutar(sesion: AsyncSession, fecha: date) -> None:
        vistas.append(fecha)

    monkeypatch.setattr(proceso_diario, "PASOS", [Paso(nombre="registrado", ejecutar=ejecutar)])

    await proceso_diario.correr(_fabrica(sesion), HOY)

    assert vistas == [HOY]


async def test_rnf05_idempotente(sesion: AsyncSession) -> None:
    pasos = [_paso_que_crea_destino("destinos", "Destino T-110")]
    antes = await _contar_destinos(sesion)

    primera = await proceso_diario.correr(_fabrica(sesion), HOY, pasos)
    despues_de_una = await _contar_destinos(sesion)
    segunda = await proceso_diario.correr(_fabrica(sesion), HOY, pasos)

    assert despues_de_una == antes + 1
    assert await _contar_destinos(sesion) == despues_de_una
    assert all(r.ok for r in primera + segunda)


async def test_rnf05_paso_que_falla_no_frena_los_demas(sesion: AsyncSession) -> None:
    async def roto(sesion: AsyncSession, fecha: date) -> None:
        raise RuntimeError("paso roto")

    resultados = await proceso_diario.correr(
        _fabrica(sesion),
        HOY,
        [
            _paso_que_crea_destino("antes", "Destino antes"),
            Paso(nombre="roto", ejecutar=roto),
            _paso_que_crea_destino("despues", "Destino después"),
        ],
    )

    por_nombre = {r.nombre: r for r in resultados}
    assert [r.nombre for r in resultados] == ["antes", "roto", "despues"]
    assert por_nombre["antes"].ok is True
    assert por_nombre["roto"].ok is False
    assert por_nombre["despues"].ok is True
    nombres = set(await sesion.scalars(select(m.Destino.nombre)))
    assert {"Destino antes", "Destino después"} <= nombres


async def test_rnf13_cada_paso_en_su_transaccion_el_que_falla_se_revierte(
    sesion: AsyncSession,
) -> None:
    async def escribe_y_falla(sesion: AsyncSession, fecha: date) -> None:
        await crear(sesion, DestinoFactory, nombre="Destino a medias")
        raise RuntimeError("falla después de escribir")

    await proceso_diario.correr(
        _fabrica(sesion),
        HOY,
        [
            _paso_que_crea_destino("antes", "Destino antes"),
            Paso(nombre="roto", ejecutar=escribe_y_falla),
            _paso_que_crea_destino("despues", "Destino después"),
        ],
    )

    nombres = set(await sesion.scalars(select(m.Destino.nombre)))
    assert "Destino a medias" not in nombres
    assert {"Destino antes", "Destino después"} <= nombres


async def test_rnf13_cada_paso_pide_su_propia_sesion(sesion: AsyncSession) -> None:
    pedidas = 0

    def fabrica() -> _Contexto:
        nonlocal pedidas
        pedidas += 1
        return _Contexto(sesion)

    await proceso_diario.correr(
        fabrica,
        HOY,
        [_paso_que_crea_destino("a", "Destino a"), _paso_que_crea_destino("b", "Destino b")],
    )

    assert pedidas == 2


async def test_rf152_la_auditoria_del_proceso_queda_sin_autor(sesion: AsyncSession) -> None:
    marca = usuario_auditoria.set(None)
    try:
        await proceso_diario.correr(
            _fabrica(sesion), HOY, [_paso_que_crea_destino("destinos", "Destino sin autor")]
        )
    finally:
        usuario_auditoria.reset(marca)

    destino = await sesion.scalar(select(m.Destino).where(m.Destino.nombre == "Destino sin autor"))
    assert destino is not None
    assert destino.created_by is None
    assert destino.updated_by is None


async def test_rnf13_registra_en_el_log_que_hizo_cada_paso(
    sesion: AsyncSession, caplog: pytest.LogCaptureFixture
) -> None:
    async def roto(sesion: AsyncSession, fecha: date) -> None:
        raise RuntimeError("explotó el paso")

    with caplog.at_level(logging.INFO):
        await proceso_diario.correr(
            _fabrica(sesion),
            HOY,
            [_paso_que_crea_destino("vencer-pagos", "Destino log"), Paso("recontactar", roto)],
        )

    texto = "\n".join(r.getMessage() for r in caplog.records)
    assert "vencer-pagos" in texto
    assert "creó el destino" in texto
    assert "recontactar" in texto
    assert "explotó el paso" in texto
    assert any(
        r.levelno >= logging.ERROR and "recontactar" in r.getMessage() for r in caplog.records
    )


async def test_rnf05_fecha_por_argumento_dd_mm_aa(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    vistas: list[date] = []

    async def ejecutar(sesion: AsyncSession, fecha: date) -> None:
        vistas.append(fecha)

    monkeypatch.setattr(proceso_diario, "PASOS", [Paso("p", ejecutar)])

    codigo = await diario.ejecutar(["--fecha", "15/03/26"], fabrica_sesiones=_fabrica(sesion))

    assert vistas == [date(2026, 3, 15)]
    assert codigo == 0


@pytest.mark.parametrize("texto", ["2026-03-15", "31/02/26", "mañana", ""])
async def test_rnf05_fecha_invalida_termina_con_error(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch, texto: str
) -> None:
    monkeypatch.setattr(proceso_diario, "PASOS", [])

    with pytest.raises(SystemExit) as salida:
        await diario.ejecutar(["--fecha", texto], fabrica_sesiones=_fabrica(sesion))

    assert salida.value.code not in (0, None)


async def test_rnf05_fecha_en_zona_argentina(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Sin --fecha se usa `fechas.hoy()` (hora de Argentina), no la fecha UTC ni la del servidor.
    vistas: list[date] = []

    async def ejecutar(sesion: AsyncSession, fecha: date) -> None:
        vistas.append(fecha)

    monkeypatch.setattr(proceso_diario, "PASOS", [Paso("p", ejecutar)])
    monkeypatch.setattr(fechas, "hoy", lambda: date(2026, 12, 31))

    await diario.ejecutar([], fabrica_sesiones=_fabrica(sesion))

    assert vistas == [date(2026, 12, 31)]


async def test_rnf05_codigo_de_salida_cero_si_todo_anda(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        proceso_diario, "PASOS", [_paso_que_crea_destino("destinos", "Destino salida 0")]
    )

    assert await diario.ejecutar(["--fecha", "02/11/26"], fabrica_sesiones=_fabrica(sesion)) == 0


async def test_rnf05_codigo_de_salida_de_error_si_un_paso_falla_y_los_demas_corren(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def roto(sesion: AsyncSession, fecha: date) -> None:
        raise RuntimeError("paso roto")

    monkeypatch.setattr(
        proceso_diario,
        "PASOS",
        [Paso("roto", roto), _paso_que_crea_destino("destinos", "Destino tras el error")],
    )

    codigo = await diario.ejecutar(["--fecha", "02/11/26"], fabrica_sesiones=_fabrica(sesion))

    assert codigo != 0
    existe = await sesion.scalar(
        select(m.Destino).where(m.Destino.nombre == "Destino tras el error")
    )
    assert existe is not None
