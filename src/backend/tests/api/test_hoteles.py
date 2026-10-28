"""T-076: gestionar los hoteles del catálogo (CU-16, RF-097, RF-098, RF-099, RF-100, RF-153).

El 401/403 por rol de las rutas ya lo cubre `test_contrato_m5.py`. Acá se fija el comportamiento.

Supuestos documentados:
- Duplicado (RF-099, CU-16 A2): dos hoteles son el mismo si tienen el mismo destino y el mismo
  nombre normalizado, es decir sin tildes, sin distinguir mayúsculas y con los espacios de más
  (bordes e internos) colapsados. Igual criterio que el nombre de destino (T-031). Responde 409
  `ProblemaHotelDuplicado` con `existente {id, nombre}`; no hay forma de guardarlo igual.
  Vale en el alta y en el PATCH (nombre o destino). Editar un hotel sin cambiar su identidad
  (nombre y destino) no choca consigo mismo.
- Un hotel `cerrado` no cuenta para el duplicado (decisión del orquestador).
- `destino_id` inexistente: 404. `null` explícito en el PATCH de nombre, destino, categoría o
  precio: 422. Editar un hotel `cerrado`: 409.
- `servicios` sin informar se guarda y se devuelve como lista vacía; `categoria` y
  `precio_referencia` como nulos.
"""

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoHotel, EstadoResena, Hotel, Resena
from tests.fabricas import ClienteFactory, DestinoFactory, HotelFactory, ResenaFactory, crear

PROBLEM_JSON = "application/problem+json"
ROLES_DE_ESCRITURA = ["admin", "dueno", "empleado"]
ROLES = [*ROLES_DE_ESCRITURA, "freelance"]
INEXISTENTE = "00000000-0000-4000-8000-000000000000"
Fabrica = Callable[[str], Awaitable[AsyncClient]]


def _url(hotel_id: uuid.UUID | str) -> str:
    return f"/api/hoteles/{hotel_id}"


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Hotel))).scalar_one()


async def _destino_id(sesion: AsyncSession) -> uuid.UUID:
    return (await crear(sesion, DestinoFactory)).id


def _cuerpo(destino_id: uuid.UUID, campos: dict[str, Any] | None = None) -> dict[str, Any]:
    base = {
        "nombre": "Hotel Llao Llao",
        "destino_id": str(destino_id),
        "categoria": "5 estrellas",
        "precio_referencia": "150000.00",
        "servicios": ["wifi", "pileta", "desayuno"],
    }
    return {**base, **(campos or {})}


# --- Alta (RF-097) ---------------------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_ESCRITURA)
async def test_rf097_alta_y_edicion(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)
    destino_id = await _destino_id(sesion)

    r = await c.post("/api/hoteles", json=_cuerpo(destino_id))

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["id"]
    assert cuerpo["nombre"] == "Hotel Llao Llao"
    assert cuerpo["destino_id"] == str(destino_id)
    assert cuerpo["categoria"] == "5 estrellas"
    assert cuerpo["precio_referencia"] == "150000.00"
    assert cuerpo["servicios"] == ["wifi", "pileta", "desayuno"]
    assert cuerpo["estado"] == "activo"
    assert cuerpo["puntaje_promedio"] is None
    assert cuerpo["cantidad_resenas"] == 0
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = await sesion.get(Hotel, uuid.UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.estado == EstadoHotel.activo

    editado = await c.patch(_url(cuerpo["id"]), json={"categoria": "4 estrellas"})

    assert editado.status_code == 200
    assert editado.json()["categoria"] == "4 estrellas"
    assert editado.json()["nombre"] == "Hotel Llao Llao"  # lo no enviado no cambia
    assert editado.json()["precio_referencia"] == "150000.00"
    assert editado.json()["servicios"] == ["wifi", "pileta", "desayuno"]


async def test_rf097_edicion_cambia_varios_campos_y_audita(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino = await crear(sesion, DestinoFactory)
    otro_destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id, nombre="Hotel Viejo")

    r = await c.patch(
        _url(hotel.id),
        json={
            "nombre": "Hotel Nuevo",
            "destino_id": str(otro_destino.id),
            "precio_referencia": "99999.50",
            "servicios": ["spa"],
        },
    )

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(hotel.id)
    assert cuerpo["nombre"] == "Hotel Nuevo"
    assert cuerpo["destino_id"] == str(otro_destino.id)
    assert cuerpo["precio_referencia"] == "99999.50"
    assert cuerpo["servicios"] == ["spa"]
    assert cuerpo["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]


async def test_rf097_alta_solo_con_nombre_y_destino(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino_id = await _destino_id(sesion)

    r = await c.post("/api/hoteles", json={"nombre": "Posada Sol", "destino_id": str(destino_id)})

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["categoria"] is None
    assert cuerpo["precio_referencia"] is None
    assert cuerpo["servicios"] == []
    assert cuerpo["estado"] == "activo"
    fila = await sesion.get(Hotel, uuid.UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.categoria is None
    assert fila.precio_referencia is None
    leido = await c.get(_url(cuerpo["id"]))
    assert leido.json()["servicios"] == []
    assert leido.json()["categoria"] is None
    assert leido.json()["precio_referencia"] is None


# --- Datos mínimos (RF-098) ------------------------------------------------------------------


@pytest.mark.parametrize(
    "cambios",
    [
        {"nombre": None},
        {"nombre": ""},
        {"nombre": "   "},
        {"nombre": "x" * 121},
        {"destino_id": None},
        {"destino_id": "no-es-uuid"},
        {"categoria": "x" * 41},
        {"precio_referencia": "caro"},
        {"precio_referencia": "-1.00"},
        {"servicios": "wifi"},
    ],
)
async def test_rf098_datos_minimos_422(
    cliente_como: Fabrica, sesion: AsyncSession, cambios: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    destino_id = await _destino_id(sesion)

    r = await c.post("/api/hoteles", json=_cuerpo(destino_id, cambios))

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


@pytest.mark.parametrize("faltante", ["nombre", "destino_id"])
async def test_rf098_alta_sin_nombre_o_destino_422(
    cliente_como: Fabrica, sesion: AsyncSession, faltante: str
) -> None:
    c = await cliente_como("empleado")
    cuerpo = _cuerpo(await _destino_id(sesion))
    del cuerpo[faltante]

    r = await c.post("/api/hoteles", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


@pytest.mark.parametrize(
    "cambios", [{"nombre": ""}, {"nombre": "   "}, {"destino_id": "no-es-uuid"}, {"servicios": 3}]
)
async def test_rf098_edicion_con_datos_invalidos_422(
    cliente_como: Fabrica, sesion: AsyncSession, cambios: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    hotel = await crear(
        sesion, HotelFactory, destino_id=await _destino_id(sesion), nombre="Intacto"
    )

    r = await c.patch(_url(hotel.id), json=cambios)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(hotel)
    assert hotel.nombre == "Intacto"


# --- Posible duplicado (RF-099, CU-16 A2) ----------------------------------------------------


async def test_rf099_posible_duplicado(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino_id = await _destino_id(sesion)
    existente = await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Llao Llao")
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json=_cuerpo(destino_id))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 409
    assert r.json()["existente"] == {"id": str(existente.id), "nombre": "Hotel Llao Llao"}
    assert await _cantidad(sesion) == 1  # sin alta


@pytest.mark.parametrize(
    "nombre", ["hotel llao llao", "HOTEL LLAO LLAO", "  Hotel   Llao Llao  ", "Hótel Llao Llao"]
)
async def test_rf099_duplicado_ignora_mayusculas_tildes_y_espacios(
    cliente_como: Fabrica, sesion: AsyncSession, nombre: str
) -> None:
    destino_id = await _destino_id(sesion)
    existente = await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Llao Llao")
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json=_cuerpo(destino_id, {"nombre": nombre}))

    assert r.status_code == 409
    assert r.json()["existente"]["id"] == str(existente.id)
    assert await _cantidad(sesion) == 1


async def test_rf099_el_mismo_nombre_en_otro_destino_no_es_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await crear(sesion, HotelFactory, destino_id=await _destino_id(sesion), nombre="Hotel Sol")
    otro_destino = await _destino_id(sesion)
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json=_cuerpo(otro_destino, {"nombre": "Hotel Sol"}))

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf099_otro_nombre_en_el_mismo_destino_no_es_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino_id = await _destino_id(sesion)
    await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Sol")
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json=_cuerpo(destino_id, {"nombre": "Hotel Luna"}))

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf099_no_hay_forma_de_guardar_el_duplicado_igual(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino_id = await _destino_id(sesion)
    await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Llao Llao")
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json={**_cuerpo(destino_id), "confirmar_duplicado": True})

    assert r.status_code == 409
    assert await _cantidad(sesion) == 1


async def test_rf099_editar_el_nombre_a_uno_existente_en_el_destino_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino_id = await _destino_id(sesion)
    otro = await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Sol")
    hotel = await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Luna")
    c = await cliente_como("empleado")

    r = await c.patch(_url(hotel.id), json={"nombre": "hotel sol"})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["existente"] == {"id": str(otro.id), "nombre": "Hotel Sol"}
    await sesion.refresh(hotel)
    assert hotel.nombre == "Hotel Luna"


async def test_rf099_mover_el_hotel_a_un_destino_donde_ya_existe_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino_a = await _destino_id(sesion)
    destino_b = await _destino_id(sesion)
    en_b = await crear(sesion, HotelFactory, destino_id=destino_b, nombre="Hotel Sol")
    hotel = await crear(sesion, HotelFactory, destino_id=destino_a, nombre="Hotel Sol")
    c = await cliente_como("empleado")

    r = await c.patch(_url(hotel.id), json={"destino_id": str(destino_b)})

    assert r.status_code == 409
    assert r.json()["existente"]["id"] == str(en_b.id)
    await sesion.refresh(hotel)
    assert hotel.destino_id == destino_a


async def test_rf099_editar_sin_cambiar_nombre_ni_destino_no_choca_consigo_mismo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino_id = await _destino_id(sesion)
    hotel = await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Sol")
    c = await cliente_como("empleado")

    mismo = await c.patch(
        _url(hotel.id), json={"nombre": "Hotel Sol", "destino_id": str(destino_id)}
    )
    solo_mayusculas = await c.patch(_url(hotel.id), json={"nombre": "HOTEL SOL"})

    assert mismo.status_code == 200
    assert solo_mayusculas.status_code == 200
    assert solo_mayusculas.json()["nombre"] == "HOTEL SOL"


# --- Baja lógica (RF-100, CU-16 A4) ----------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_DE_ESCRITURA)
async def test_rf100_baja_hotel_cerrado(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    hotel = await crear(sesion, HotelFactory, destino_id=await _destino_id(sesion))
    cliente = await crear(sesion, ClienteFactory)
    publicada = await crear(sesion, ResenaFactory, cliente_id=cliente.id, hotel_id=hotel.id)
    oculta = await crear(
        sesion,
        ResenaFactory,
        cliente_id=cliente.id,
        hotel_id=hotel.id,
        estado="oculta",
        motivo_baja="Lenguaje ofensivo",
    )

    r = await c.post(f"{_url(hotel.id)}/baja")

    assert r.status_code == 200
    assert r.json()["id"] == str(hotel.id)
    assert r.json()["estado"] == "cerrado"
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(hotel)
    assert hotel.estado == EstadoHotel.cerrado  # no se borra
    cantidad = await sesion.execute(
        select(func.count()).select_from(Resena).where(Resena.hotel_id == hotel.id)
    )
    assert cantidad.scalar_one() == 2  # sus reseñas siguen
    await sesion.refresh(publicada)
    await sesion.refresh(oculta)
    assert publicada.estado == EstadoResena.publicada
    assert oculta.estado == EstadoResena.oculta
    consulta = await c.get(_url(hotel.id))
    assert consulta.status_code == 200
    assert consulta.json()["estado"] == "cerrado"


async def test_rf100_baja_de_un_hotel_ya_cerrado_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await crear(
        sesion, HotelFactory, destino_id=await _destino_id(sesion), estado=EstadoHotel.cerrado
    )

    r = await c.post(f"{_url(hotel.id)}/baja")

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 409
    await sesion.refresh(hotel)
    assert hotel.estado == EstadoHotel.cerrado


async def test_rf100_baja_doble_responde_200_y_luego_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await crear(sesion, HotelFactory, destino_id=await _destino_id(sesion))

    primera = await c.post(f"{_url(hotel.id)}/baja")
    segunda = await c.post(f"{_url(hotel.id)}/baja")

    assert primera.status_code == 200
    assert segunda.status_code == 409


async def test_rf100_baja_de_hotel_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.post(f"{_url(INEXISTENTE)}/baja")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Consulta ---------------------------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES)
async def test_rf153_obtener_hotel(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)
    destino_id = await _destino_id(sesion)
    hotel = await crear(
        sesion,
        HotelFactory,
        destino_id=destino_id,
        nombre="Hotel Sol",
        categoria="3 estrellas",
        servicios="wifi, pileta",
    )

    r = await c.get(_url(hotel.id))

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(hotel.id)
    assert cuerpo["nombre"] == "Hotel Sol"
    assert cuerpo["destino_id"] == str(destino_id)
    assert cuerpo["categoria"] == "3 estrellas"
    assert cuerpo["precio_referencia"] == "85000.00"
    assert cuerpo["servicios"] == ["wifi", "pileta"]
    assert cuerpo["estado"] == "activo"
    assert cuerpo["puntaje_promedio"] is None
    assert cuerpo["cantidad_resenas"] == 0


async def test_rf153_obtener_hotel_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.get(_url(INEXISTENTE))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 404


async def test_rf097_editar_hotel_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(_url(INEXISTENTE), json={"categoria": "4 estrellas"})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Freelance (DEC-0008) ---------------------------------------------------------------------


async def test_freelance_403(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    destino_id = await _destino_id(sesion)
    hotel = await crear(sesion, HotelFactory, destino_id=destino_id, nombre="Hotel Sol")

    alta = await c.post("/api/hoteles", json=_cuerpo(destino_id))
    edicion = await c.patch(_url(hotel.id), json={"nombre": "Otro"})
    baja = await c.post(f"{_url(hotel.id)}/baja")

    for r in (alta, edicion, baja):
        assert r.status_code == 403
        assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 1
    await sesion.refresh(hotel)
    assert hotel.nombre == "Hotel Sol"
    assert hotel.estado == EstadoHotel.activo


# --- Decisiones del orquestador ---------------------------------------------------------------


async def test_rf099_un_hotel_cerrado_no_cuenta_para_el_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino_id = await _destino_id(sesion)
    await crear(
        sesion,
        HotelFactory,
        destino_id=destino_id,
        nombre="Hotel Llao Llao",
        estado=EstadoHotel.cerrado,
    )
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json=_cuerpo(destino_id))

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf097_alta_con_destino_inexistente_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/hoteles", json=_cuerpo(uuid.UUID(INEXISTENTE)))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf097_edicion_con_destino_inexistente_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    destino_id = await _destino_id(sesion)
    hotel = await crear(sesion, HotelFactory, destino_id=destino_id)

    r = await c.patch(_url(hotel.id), json={"destino_id": INEXISTENTE})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(hotel)
    assert hotel.destino_id == destino_id


@pytest.mark.parametrize("campo", ["nombre", "destino_id", "categoria", "precio_referencia"])
async def test_rf098_edicion_con_null_explicito_422(
    cliente_como: Fabrica, sesion: AsyncSession, campo: str
) -> None:
    c = await cliente_como("empleado")
    hotel = await crear(sesion, HotelFactory, destino_id=await _destino_id(sesion))

    r = await c.patch(_url(hotel.id), json={campo: None})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf100_editar_un_hotel_cerrado_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await crear(
        sesion,
        HotelFactory,
        destino_id=await _destino_id(sesion),
        nombre="Hotel Viejo",
        estado=EstadoHotel.cerrado,
    )

    r = await c.patch(_url(hotel.id), json={"nombre": "Hotel Nuevo"})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(hotel)
    assert hotel.nombre == "Hotel Viejo"
