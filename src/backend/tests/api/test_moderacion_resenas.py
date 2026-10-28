"""T-079: moderar las reseñas de los hoteles (CU-29, RF-111, RF-112, RF-153, DEC-0003).

El 401/403 por rol y la forma del contrato ya las cubre `test_contrato_m5.py`. Acá se fija el
comportamiento.

Supuestos documentados:
- Ocultar es la baja lógica: `estado = oculta`, `motivo_baja` guardado y `updated_by` del actor.
- Restaurar vuelve a `publicada` y deja `motivo_baja` en null (CHECK `resena_motivo_baja_ck`).
- Ocultar una oculta y restaurar una publicada responden 409 (review de T-075).
- Eliminación física (CU-29 A2): decisión de Francisco (28/10/26). Se elimina solo una reseña ya
  `oculta` (la baja lógica es el camino por defecto), con o sin `viaje_id`. Una `publicada`
  responde 409 y la fila queda.
- El motivo de baja se recorta: vacío o solo espacios responde 422.
- Empleado y freelance reciben 403 en las tres rutas.
"""

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoResena, Resena
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    HotelFactory,
    ResenaFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
ROLES_DE_MODERACION = ["admin", "dueno"]
ROLES_SIN_MODERACION = ["empleado", "freelance"]
INEXISTENTE = "00000000-0000-4000-8000-000000000000"
MOTIVO = "Lenguaje ofensivo"
Fabrica = Callable[[str], Awaitable[AsyncClient]]


def _ocultar(resena_id: uuid.UUID | str) -> str:
    return f"/api/resenas/{resena_id}/ocultar"


def _restaurar(resena_id: uuid.UUID | str) -> str:
    return f"/api/resenas/{resena_id}/restaurar"


def _eliminar(resena_id: uuid.UUID | str) -> str:
    return f"/api/resenas/{resena_id}"


async def _resena(sesion: AsyncSession, **campos: Any) -> Resena:
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    cliente = await crear(sesion, ClienteFactory)
    return await crear(sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, **campos)


async def _oculta(sesion: AsyncSession, **campos: Any) -> Resena:
    return await _resena(sesion, estado="oculta", motivo_baja=MOTIVO, **campos)


def _problema(r: Any, estado: int) -> None:
    assert r.status_code == estado
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Ocultar (RF-111) -------------------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_MODERACION)
async def test_rf111_ocultar(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)
    resena = await _resena(sesion, puntaje=2)

    r = await c.post(_ocultar(resena.id), json={"motivo_baja": MOTIVO})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(resena.id)
    assert cuerpo["estado"] == "oculta"
    assert cuerpo["motivo_baja"] == MOTIVO
    assert cuerpo["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(resena)
    assert resena.estado == EstadoResena.oculta
    assert resena.motivo_baja == MOTIVO
    assert resena.updated_by == c.usuario.id  # type: ignore[attr-defined]
    assert resena.puntaje == 2  # el contenido se conserva (trazabilidad)


@pytest.mark.parametrize("cuerpo", [{"motivo_baja": ""}, {"motivo_baja": "   "}, {}])
async def test_rf111_ocultar_sin_motivo_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")
    resena = await _resena(sesion)

    r = await c.post(_ocultar(resena.id), json=cuerpo)

    _problema(r, 422)
    await sesion.refresh(resena)
    assert resena.estado == EstadoResena.publicada
    assert resena.motivo_baja is None


async def test_rf111_ocultar_una_oculta_409(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    resena = await _oculta(sesion)

    r = await c.post(_ocultar(resena.id), json={"motivo_baja": "Otro motivo"})

    _problema(r, 409)
    await sesion.refresh(resena)
    assert resena.motivo_baja == MOTIVO  # no se pisa


async def test_rf111_ocultar_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(_ocultar(INEXISTENTE), json={"motivo_baja": MOTIVO})

    _problema(r, 404)


# --- Restaurar (RF-112, CU-29 A1) -------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_MODERACION)
async def test_rf112_restaurar(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)
    resena = await _oculta(sesion)

    r = await c.post(_restaurar(resena.id))

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(resena.id)
    assert cuerpo["estado"] == "publicada"
    assert cuerpo["motivo_baja"] is None
    assert cuerpo["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(resena)
    assert resena.estado == EstadoResena.publicada
    assert resena.motivo_baja is None
    assert resena.updated_by == c.usuario.id  # type: ignore[attr-defined]


async def test_rf112_restaurar_una_publicada_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    resena = await _resena(sesion)

    r = await c.post(_restaurar(resena.id))

    _problema(r, 409)
    await sesion.refresh(resena)
    assert resena.estado == EstadoResena.publicada


async def test_rf112_restaurar_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(_restaurar(INEXISTENTE))

    _problema(r, 404)


async def test_rf112_ocultar_y_restaurar_deja_la_resena_como_estaba(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    resena = await _resena(sesion, puntaje=3, comentario="Normal")

    oculta = await c.post(_ocultar(resena.id), json={"motivo_baja": MOTIVO})
    vuelta = await c.post(_restaurar(resena.id))

    assert oculta.status_code == 200
    assert vuelta.status_code == 200
    assert vuelta.json()["estado"] == "publicada"
    assert vuelta.json()["puntaje"] == 3
    assert vuelta.json()["comentario"] == "Normal"
    # y se puede volver a ocultar con otro motivo
    otra = await c.post(_ocultar(resena.id), json={"motivo_baja": "Spam"})
    assert otra.status_code == 200
    assert otra.json()["motivo_baja"] == "Spam"


# --- Eliminación física excepcional (CU-29 A2) ------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_MODERACION)
async def test_eliminacion_fisica(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    """Caso excepcional: reseña ya oculta."""
    c = await cliente_como(rol)
    resena = await _oculta(sesion)
    resena_id = resena.id

    r = await c.delete(_eliminar(resena_id))

    assert r.status_code == 204
    assert r.content == b""
    sesion.expunge_all()
    assert await sesion.get(Resena, resena_id) is None


async def test_eliminacion_fisica_de_una_publicada_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Por defecto siempre baja lógica: una publicada no se borra."""
    c = await cliente_como("admin")
    resena = await _resena(sesion)

    r = await c.delete(_eliminar(resena.id))

    _problema(r, 409)
    await sesion.refresh(resena)
    assert resena.estado == EstadoResena.publicada


async def test_eliminacion_fisica_de_una_oculta_con_viaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Una oculta se elimina aunque tenga viaje de origen (decisión del 28/10/26)."""
    c = await cliente_como("admin")
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    cliente = await crear(sesion, ClienteFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=c.usuario.id,  # type: ignore[attr-defined]
    )
    resena = await crear(
        sesion,
        ResenaFactory,
        hotel_id=hotel.id,
        cliente_id=cliente.id,
        viaje_id=viaje.id,
        estado="oculta",
        motivo_baja=MOTIVO,
    )
    resena_id = resena.id

    r = await c.delete(_eliminar(resena_id))

    assert r.status_code == 204
    sesion.expunge_all()
    assert await sesion.get(Resena, resena_id) is None


async def test_eliminacion_fisica_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.delete(_eliminar(INEXISTENTE))

    _problema(r, 404)


# --- Roles ------------------------------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_SIN_MODERACION)
async def test_rf153_solo_admin_y_dueno_moderan_403(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    publicada = await _resena(sesion)
    oculta = await _oculta(sesion)

    ocultar = await c.post(_ocultar(publicada.id), json={"motivo_baja": MOTIVO})
    restaurar = await c.post(_restaurar(oculta.id))
    eliminar = await c.delete(_eliminar(oculta.id))

    for r in (ocultar, restaurar, eliminar):
        _problema(r, 403)
    await sesion.refresh(publicada)
    await sesion.refresh(oculta)
    assert publicada.estado == EstadoResena.publicada
    assert oculta.estado == EstadoResena.oculta  # y la fila sigue ahí


# --- Resumen del hotel (RF-111, CU-18) --------------------------------------------------------


async def test_promedio_sin_ocultas(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    cliente = await crear(sesion, ClienteFactory)
    for puntaje in (5, 5):
        await crear(
            sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, puntaje=puntaje
        )
    a_ocultar = await crear(
        sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, puntaje=1
    )
    antes = await c.get(f"/api/hoteles/{hotel.id}")
    assert antes.json()["cantidad_resenas"] == 3
    assert float(antes.json()["puntaje_promedio"]) == pytest.approx(3.67, abs=0.005)

    ocultada = await c.post(_ocultar(a_ocultar.id), json={"motivo_baja": MOTIVO})
    r = await c.get(f"/api/hoteles/{hotel.id}")

    assert ocultada.status_code == 200
    assert r.json()["cantidad_resenas"] == 2
    assert float(r.json()["puntaje_promedio"]) == pytest.approx(5.0)

    restaurada = await c.post(_restaurar(a_ocultar.id))
    r = await c.get(f"/api/hoteles/{hotel.id}")

    assert restaurada.status_code == 200
    assert r.json()["cantidad_resenas"] == 3
    assert float(r.json()["puntaje_promedio"]) == pytest.approx(3.67, abs=0.005)


async def test_promedio_sin_ocultas_si_se_oculta_la_unica_queda_sin_puntaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    resena = await _resena(sesion, puntaje=4)

    await c.post(_ocultar(resena.id), json={"motivo_baja": MOTIVO})
    r = await c.get(f"/api/hoteles/{resena.hotel_id}")

    assert r.json()["cantidad_resenas"] == 0
    assert r.json()["puntaje_promedio"] is None
