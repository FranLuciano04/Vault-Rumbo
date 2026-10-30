"""T-096: avanzar el estado del viaje a en curso o finalizado (CU-08; RF-039 a RF-042, EST-Viaje).

Endpoints: POST /viajes/{id}/iniciar, /finalizar y /corregir-estado. Supuestos que el ticket no
dice de forma explícita y que fijan estos tests:

- El valor de `estado` en el JSON es el del enum: `en_curso`.
- `iniciar` solo desde `confirmado` (T4) y `finalizar` solo desde `en_curso` (T5); la secuencia es
  estricta: desde cualquier otro estado responde 409 (problem+json) y no cambia nada.
- `corregir-estado` solo deshace pasos manuales: `en_curso -> confirmado` y
  `finalizado -> en_curso`. Desde `reservado`, `vendido`, `confirmado` o `cancelado` responde 409.
- RF-041: al finalizar queda una Alerta `resena` pendiente atada al viaje. La fecha no está fijada
  por el ticket, así que no se afirma.
- RF-042: al deshacer `finalizado`, la Alerta `resena` pendiente pasa a `resuelta`.
- El viaje inexistente responde 404.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"


def _url(viaje_id: uuid.UUID, accion: str) -> str:
    return f"/api/viajes/{viaje_id}/{accion}"


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _viaje(sesion: AsyncSession, responsable_id: uuid.UUID, estado: m.EstadoViaje) -> m.Viaje:
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    # un viaje cancelado lleva estado previo, motivo y fecha (viaje_estado_previo_ck)
    cancelacion = (
        {
            "estado_previo": m.EstadoViaje.confirmado,
            "motivo_cancelacion": "El cliente desistió",
            "fecha_cancelacion": date(2026, 11, 5),
        }
        if estado is m.EstadoViaje.cancelado
        else {}
    )
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        estado=estado,
        **cancelacion,
    )


async def _estado_en_base(sesion: AsyncSession, viaje_id: uuid.UUID) -> m.EstadoViaje:
    sesion.expire_all()
    viaje = await sesion.get(m.Viaje, viaje_id)
    assert viaje is not None
    return viaje.estado


async def _alertas_resena(sesion: AsyncSession, viaje_id: uuid.UUID) -> list[m.Alerta]:
    sesion.expire_all()
    consulta = select(m.Alerta).where(
        m.Alerta.viaje_id == viaje_id, m.Alerta.tipo == m.TipoAlerta.resena
    )
    return list((await sesion.scalars(consulta)).all())


async def test_rf039_iniciar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.confirmado)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "iniciar"))

    assert r.status_code == 200
    assert r.json()["id"] == str(viaje_id)
    assert r.json()["estado"] == "en_curso"
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.en_curso


async def test_rf039_finalizar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "finalizar"))

    assert r.status_code == 200
    assert r.json()["estado"] == "finalizado"
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.finalizado


async def test_rf039_iniciar_no_saltea_confirmado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """EST-Viaje: sin estar totalmente pagado (`confirmado`) no se pasa a en curso."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "iniciar"))

    assert r.status_code == 409
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.vendido


async def test_rf041_agenda_resena(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.en_curso)
    viaje_id = viaje.id
    assert await _alertas_resena(sesion, viaje_id) == []

    r = await c.post(_url(viaje_id, "finalizar"))

    assert r.status_code == 200
    alertas = await _alertas_resena(sesion, viaje_id)
    assert len(alertas) == 1
    assert alertas[0].estado == m.EstadoAlerta.pendiente


async def test_rf041_iniciar_no_agenda_resena(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.confirmado)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "iniciar"))

    assert r.status_code == 200
    assert await _alertas_resena(sesion, viaje_id) == []


async def test_rf042_corregir_en_curso_vuelve_a_confirmado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "corregir-estado"))

    assert r.status_code == 200
    assert r.json()["estado"] == "confirmado"
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.confirmado


async def test_rf042_corregir_finalizado_vuelve_a_en_curso(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.finalizado)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "corregir-estado"))

    assert r.status_code == 200
    assert r.json()["estado"] == "en_curso"
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.en_curso


async def test_rf042_corregir_finalizado_cierra_la_alerta_de_resena_pendiente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.en_curso)
    viaje_id = viaje.id
    assert (await c.post(_url(viaje_id, "finalizar"))).status_code == 200
    assert len(await _alertas_resena(sesion, viaje_id)) == 1

    r = await c.post(_url(viaje_id, "corregir-estado"))

    assert r.status_code == 200
    alertas = await _alertas_resena(sesion, viaje_id)
    assert [a.estado for a in alertas] == [m.EstadoAlerta.resuelta]


@pytest.mark.parametrize(
    "estado",
    [
        m.EstadoViaje.reservado,
        m.EstadoViaje.vendido,
        m.EstadoViaje.confirmado,
        m.EstadoViaje.cancelado,
    ],
)
async def test_rf042_corregir_solo_deshace_pasos_manuales(
    cliente_como: Fabrica, sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    """Los estados que produjo un cobro o la cancelación se deshacen por su propio flujo."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "corregir-estado"))

    assert r.status_code == 409
    assert await _estado_en_base(sesion, viaje_id) == estado


@pytest.mark.parametrize(
    ("accion", "estado"),
    [
        ("iniciar", m.EstadoViaje.reservado),
        ("iniciar", m.EstadoViaje.en_curso),
        ("iniciar", m.EstadoViaje.finalizado),
        ("iniciar", m.EstadoViaje.cancelado),
        ("finalizar", m.EstadoViaje.reservado),
        ("finalizar", m.EstadoViaje.vendido),
        ("finalizar", m.EstadoViaje.confirmado),
        ("finalizar", m.EstadoViaje.finalizado),
        ("finalizar", m.EstadoViaje.cancelado),
    ],
)
async def test_transicion_invalida_409(
    cliente_como: Fabrica, sesion: AsyncSession, accion: str, estado: m.EstadoViaje
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, accion))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _estado_en_base(sesion, viaje_id) == estado
    assert await _alertas_resena(sesion, viaje_id) == []


@pytest.mark.parametrize("accion", ["iniciar", "finalizar", "corregir-estado"])
async def test_viaje_inexistente_404(cliente_como: Fabrica, accion: str) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_url(uuid.uuid4(), accion))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Permisos (RF-151, DEC-0005) ---


@pytest.mark.parametrize("accion", ["iniciar", "finalizar", "corregir-estado"])
async def test_rf151_freelance_viaje_ajeno_404(
    cliente_como: Fabrica, sesion: AsyncSession, accion: str
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, accion))

    assert r.status_code == 404
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.en_curso
    assert await _alertas_resena(sesion, viaje_id) == []


@pytest.mark.parametrize("accion", ["iniciar", "finalizar", "corregir-estado"])
async def test_rf151_empleado_no_responsable_403(
    cliente_como: Fabrica, sesion: AsyncSession, accion: str
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, accion))

    assert r.status_code == 403
    assert await _estado_en_base(sesion, viaje_id) == m.EstadoViaje.en_curso
    assert await _alertas_resena(sesion, viaje_id) == []


async def test_rf041_admin_finaliza_y_la_resena_va_al_responsable(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    otro_id = otro.id
    viaje = await _viaje(sesion, otro_id, m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "finalizar"))

    assert r.status_code == 200
    alertas = await _alertas_resena(sesion, viaje_id)
    assert [a.propietario_id for a in alertas] == [otro_id]


# --- La alerta de reseña (RF-041, RF-042, DEC-0021) ---


async def test_rf041_resena_para_hoy_en_la_agenda_del_responsable(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    r = await c.post(_url(viaje_id, "finalizar"))

    assert r.status_code == 200
    alertas = await _alertas_resena(sesion, viaje_id)
    assert [(a.fecha, a.propietario_id) for a in alertas] == [(hoy(), yo)]


async def test_rf042_corregir_resuelve_la_resena_vista(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.finalizado)
    viaje_id = viaje.id
    await f.crear(
        sesion,
        f.AlertaFactory,
        tipo=m.TipoAlerta.resena,
        estado=m.EstadoAlerta.vista,
        propietario_id=_yo(c),
        viaje_id=viaje_id,
    )

    r = await c.post(_url(viaje_id, "corregir-estado"))

    assert r.status_code == 200
    alertas = await _alertas_resena(sesion, viaje_id)
    assert [a.estado for a in alertas] == [m.EstadoAlerta.resuelta]


async def test_rf042_finalizar_corregir_finalizar_deja_una_resuelta_y_una_pendiente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.en_curso)
    viaje_id = viaje.id

    for accion in ("finalizar", "corregir-estado", "finalizar"):
        assert (await c.post(_url(viaje_id, accion))).status_code == 200

    alertas = await _alertas_resena(sesion, viaje_id)
    assert sorted(a.estado.value for a in alertas) == ["pendiente", "resuelta"]


async def test_rf042_corregir_no_toca_la_resena_ya_resuelta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.finalizado)
    viaje_id = viaje.id
    resuelta_en = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
    await f.crear(
        sesion,
        f.AlertaFactory,
        tipo=m.TipoAlerta.resena,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=resuelta_en,
        propietario_id=_yo(c),
        viaje_id=viaje_id,
    )

    r = await c.post(_url(viaje_id, "corregir-estado"))

    assert r.status_code == 200
    alertas = await _alertas_resena(sesion, viaje_id)
    assert [(a.estado, a.resuelta_en) for a in alertas] == [(m.EstadoAlerta.resuelta, resuelta_en)]
