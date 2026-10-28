"""T-078: registrar y editar las reseñas de un hotel (CU-17, RF-101 a RF-105, DEC-0003).

El 401/403 por rol y la forma del contrato ya las cubre `test_contrato_m5.py`. Acá se fija el
comportamiento.

Supuestos documentados:
- Un hotel `cerrado` se puede reseñar: la reseña es de una estadía pasada y el cierre no borra el
  historial (CU-16 A4).
- Viaje de otro cliente, o inexistente: 422 con el campo `viaje_id`. Cliente inexistente: 422 con
  el campo `cliente_id`. Hotel inexistente: 404.
- La reseña nace `publicada`, sin `motivo_baja`, y `created_by` es quien la registró.
- `comentario` es opcional y por defecto queda vacío.
- Editar (RF-105) cambia puntaje, comentario y fecha; lo no enviado no cambia. Una reseña `oculta`
  no se edita: 409. El hotel, el cliente y el viaje no se mueven.
- El resumen del hotel (`puntaje_promedio`, `cantidad_resenas`) cuenta solo las publicadas.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoHotel, EstadoResena, Resena
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    HotelFactory,
    ResenaFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
ROLES_DE_ESCRITURA = ["admin", "dueno", "empleado"]
INEXISTENTE = "00000000-0000-4000-8000-000000000000"
Fabrica = Callable[[str], Awaitable[AsyncClient]]


def _alta(hotel_id: uuid.UUID | str) -> str:
    return f"/api/hoteles/{hotel_id}/resenas"


def _edicion(resena_id: uuid.UUID | str) -> str:
    return f"/api/resenas/{resena_id}"


async def _hotel(sesion: AsyncSession, **campos: Any) -> Any:
    destino = await crear(sesion, DestinoFactory)
    return await crear(sesion, HotelFactory, destino_id=destino.id, **campos)


async def _viaje(sesion: AsyncSession, cliente_id: uuid.UUID, responsable_id: uuid.UUID) -> Any:
    destino = await crear(sesion, DestinoFactory)
    return await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente_id,
        destino_id=destino.id,
        responsable_id=responsable_id,
    )


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Resena))).scalar_one()


def _cuerpo(cliente_id: uuid.UUID, campos: dict[str, Any] | None = None) -> dict[str, Any]:
    base = {
        "cliente_id": str(cliente_id),
        "puntaje": 4,
        "comentario": "Muy buena atención",
        "fecha": "2026-10-20",
    }
    return {**base, **(campos or {})}


# --- Registrar (RF-101) ----------------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_ESCRITURA)
async def test_rf101_registrar(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id))

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["id"]
    assert cuerpo["hotel_id"] == str(hotel.id)
    assert cuerpo["cliente_id"] == str(cliente.id)
    assert cuerpo["viaje_id"] is None
    assert cuerpo["puntaje"] == 4
    assert cuerpo["comentario"] == "Muy buena atención"
    assert cuerpo["fecha"] == "2026-10-20"
    assert cuerpo["estado"] == "publicada"
    assert cuerpo["motivo_baja"] is None
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = await sesion.get(Resena, uuid.UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.estado == EstadoResena.publicada
    assert fila.hotel_id == hotel.id
    assert fila.created_by == c.usuario.id  # type: ignore[attr-defined]


async def test_rf101_el_comentario_es_opcional(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    cuerpo = _cuerpo(cliente.id)
    del cuerpo["comentario"]

    r = await c.post(_alta(hotel.id), json=cuerpo)

    assert r.status_code == 201
    assert r.json()["comentario"] == ""


@pytest.mark.parametrize("puntaje", [1, 2, 3, 4, 5])
async def test_rf101_acepta_los_puntajes_de_uno_a_cinco(
    cliente_como: Fabrica, sesion: AsyncSession, puntaje: int
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": puntaje}))

    assert r.status_code == 201
    assert r.json()["puntaje"] == puntaje


async def test_rf101_hotel_inexistente_404(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    cliente = await crear(sesion, ClienteFactory)

    r = await c.post(_alta(INEXISTENTE), json=_cuerpo(cliente.id))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf101_cliente_inexistente_422_en_su_campo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)

    r = await c.post(_alta(hotel.id), json=_cuerpo(uuid.UUID(INEXISTENTE)))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "cliente_id" in r.text
    assert await _cantidad(sesion) == 0


async def test_rf101_un_hotel_cerrado_se_puede_resenar(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Decisión: la reseña es de una estadía pasada; cerrar el hotel no la impide."""
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion, estado=EstadoHotel.cerrado)
    cliente = await crear(sesion, ClienteFactory)

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id))

    assert r.status_code == 201
    assert r.json()["hotel_id"] == str(hotel.id)
    assert await _cantidad(sesion) == 1


# --- Asociar a un viaje (RF-102, CU-17 A1) ----------------------------------------------------


async def test_rf102_asociar_viaje(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    viaje = await _viaje(sesion, cliente.id, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"viaje_id": str(viaje.id)}))

    assert r.status_code == 201
    assert r.json()["viaje_id"] == str(viaje.id)
    fila = await sesion.get(Resena, uuid.UUID(r.json()["id"]))
    assert fila is not None
    assert fila.viaje_id == viaje.id


async def test_rf102_el_viaje_de_otro_cliente_422_en_viaje_id(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    otro = await crear(sesion, ClienteFactory)
    viaje_ajeno = await _viaje(sesion, otro.id, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"viaje_id": str(viaje_ajeno.id)}))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "viaje_id" in r.text
    assert await _cantidad(sesion) == 0


async def test_rf102_viaje_inexistente_422_en_viaje_id(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"viaje_id": INEXISTENTE}))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "viaje_id" in r.text
    assert await _cantidad(sesion) == 0


# --- Validación (RF-103, CU-17 A2) ------------------------------------------------------------


@pytest.mark.parametrize(
    "cambios",
    [
        {"puntaje": 0},
        {"puntaje": 6},
        {"puntaje": -1},
        {"puntaje": 3.5},
        {"puntaje": "alto"},
        {"puntaje": None},
        {"fecha": "ayer"},
        {"fecha": None},
        {"cliente_id": "no-es-uuid"},
        {"cliente_id": None},
        {"viaje_id": "no-es-uuid"},
    ],
)
async def test_rf103_validacion_422(
    cliente_como: Fabrica, sesion: AsyncSession, cambios: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)

    r = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, cambios))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


@pytest.mark.parametrize("faltante", ["cliente_id", "puntaje", "fecha"])
async def test_rf103_alta_sin_campo_obligatorio_422(
    cliente_como: Fabrica, sesion: AsyncSession, faltante: str
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    cuerpo = _cuerpo(cliente.id)
    del cuerpo[faltante]

    r = await c.post(_alta(hotel.id), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


# --- Varias del mismo cliente (RF-104) --------------------------------------------------------


async def test_rf104_varias_del_mismo_cliente(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)

    primera = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": 3}))
    segunda = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": 5}))
    igual = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": 5}))

    assert [r.status_code for r in (primera, segunda, igual)] == [201, 201, 201]
    ids = {r.json()["id"] for r in (primera, segunda, igual)}
    assert len(ids) == 3
    cantidad = await sesion.execute(
        select(func.count())
        .select_from(Resena)
        .where(Resena.hotel_id == hotel.id, Resena.cliente_id == cliente.id)
    )
    assert cantidad.scalar_one() == 3


# --- Editar (RF-105) --------------------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_ESCRITURA)
async def test_rf105_editar(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    resena = await crear(
        sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, puntaje=5
    )

    r = await c.patch(
        _edicion(resena.id),
        json={"puntaje": 3, "comentario": "El desayuno flojo", "fecha": "2026-11-02"},
    )

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(resena.id)
    assert cuerpo["puntaje"] == 3
    assert cuerpo["comentario"] == "El desayuno flojo"
    assert cuerpo["fecha"] == "2026-11-02"
    assert cuerpo["estado"] == "publicada"
    assert cuerpo["hotel_id"] == str(hotel.id)
    assert cuerpo["cliente_id"] == str(cliente.id)
    assert cuerpo["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(resena)
    assert resena.puntaje == 3
    assert resena.comentario == "El desayuno flojo"
    assert resena.fecha == date(2026, 11, 2)
    assert resena.updated_by == c.usuario.id  # type: ignore[attr-defined]


async def test_rf105_editar_solo_un_campo_deja_el_resto(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    viaje = await _viaje(sesion, cliente.id, c.usuario.id)  # type: ignore[attr-defined]
    resena = await crear(
        sesion,
        ResenaFactory,
        hotel_id=hotel.id,
        cliente_id=cliente.id,
        viaje_id=viaje.id,
        puntaje=5,
        comentario="Excelente atención",
        fecha=date(2026, 10, 1),
    )

    r = await c.patch(_edicion(resena.id), json={"puntaje": 2})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["puntaje"] == 2
    assert cuerpo["comentario"] == "Excelente atención"
    assert cuerpo["fecha"] == "2026-10-01"
    assert cuerpo["viaje_id"] == str(viaje.id)


async def test_rf105_el_hotel_y_el_cliente_no_se_mueven(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    otro_hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    otro_cliente = await crear(sesion, ClienteFactory)
    resena = await crear(sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id)

    r = await c.patch(
        _edicion(resena.id),
        json={
            "puntaje": 2,
            "hotel_id": str(otro_hotel.id),
            "cliente_id": str(otro_cliente.id),
        },
    )

    assert r.status_code in (200, 422)
    await sesion.refresh(resena)
    assert resena.hotel_id == hotel.id
    assert resena.cliente_id == cliente.id


@pytest.mark.parametrize(
    "cambios",
    [{"puntaje": 0}, {"puntaje": 6}, {"puntaje": None}, {"fecha": "ayer"}, {"fecha": None}],
)
async def test_rf105_edicion_con_datos_invalidos_422(
    cliente_como: Fabrica, sesion: AsyncSession, cambios: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    resena = await crear(
        sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, puntaje=5
    )

    r = await c.patch(_edicion(resena.id), json=cambios)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(resena)
    assert resena.puntaje == 5


async def test_rf105_editar_resena_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(_edicion(INEXISTENTE), json={"puntaje": 3})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf105_editar_una_resena_oculta_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    resena = await crear(
        sesion,
        ResenaFactory,
        hotel_id=hotel.id,
        cliente_id=cliente.id,
        puntaje=5,
        estado="oculta",
        motivo_baja="Lenguaje ofensivo",
    )

    r = await c.patch(_edicion(resena.id), json={"puntaje": 1})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(resena)
    assert resena.puntaje == 5
    assert resena.estado == EstadoResena.oculta


# --- Freelance (DEC-0008) ---------------------------------------------------------------------


async def test_freelance_no_registra_ni_edita_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    resena = await crear(
        sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, puntaje=5
    )

    alta = await c.post(_alta(hotel.id), json=_cuerpo(cliente.id))
    edicion = await c.patch(_edicion(resena.id), json={"puntaje": 1})

    for r in (alta, edicion):
        assert r.status_code == 403
        assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 1
    await sesion.refresh(resena)
    assert resena.puntaje == 5


# --- Resumen del hotel (CU-18) ----------------------------------------------------------------


async def test_rf101_el_resumen_del_hotel_refleja_las_resenas_publicadas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    vacio = await c.get(f"/api/hoteles/{hotel.id}")
    assert vacio.json()["puntaje_promedio"] is None
    assert vacio.json()["cantidad_resenas"] == 0

    await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": 5}))
    await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": 4}))
    await c.post(_alta(hotel.id), json=_cuerpo(cliente.id, {"puntaje": 4}))
    await crear(
        sesion,
        ResenaFactory,
        hotel_id=hotel.id,
        cliente_id=cliente.id,
        puntaje=1,
        estado="oculta",
        motivo_baja="Spam",
    )

    r = await c.get(f"/api/hoteles/{hotel.id}")

    assert r.status_code == 200
    assert r.json()["cantidad_resenas"] == 3  # la oculta no cuenta
    assert float(r.json()["puntaje_promedio"]) == pytest.approx(4.33, abs=0.005)


async def test_rf105_editar_el_puntaje_actualiza_el_promedio_del_hotel(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion)
    cliente = await crear(sesion, ClienteFactory)
    resena = await crear(
        sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, puntaje=5
    )

    editada = await c.patch(_edicion(resena.id), json={"puntaje": 3})
    r = await c.get(f"/api/hoteles/{hotel.id}")

    assert editada.status_code == 200
    assert r.json()["cantidad_resenas"] == 1
    assert float(r.json()["puntaje_promedio"]) == pytest.approx(3.0)
