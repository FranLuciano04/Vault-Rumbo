"""T-077: buscar hoteles ordenados por su puntaje (CU-18, RF-106, RF-107, RF-108, RF-109, RF-110).

El 401/403 por rol y el 422 de los filtros ya los cubre `test_contrato_m5.py`. Acá se fija el
comportamiento de `GET /api/hoteles` y `GET /api/hoteles/{id}/resenas`.

Supuestos documentados (el CU y el contrato no los precisan):
- Orden `nombre`: ascendente. Orden `precio`: `precio_referencia` ascendente, los hoteles sin
  precio al final. Orden `valoracion` (CU-18 A2): `puntaje_promedio` descendente; los hoteles sin
  reseñas publicadas van al final; el desempate es estable (nombre ascendente y, si coincide, id),
  para que la paginación no repita ni se saltee filas.
- `categoria` coincide exacto, sin distinguir mayúsculas; `precio_max` es inclusive y deja afuera
  los hoteles sin precio; `servicio` es un servicio que el hotel debe ofrecer (`@>`), sin
  distinguir mayúsculas. Los filtros se combinan con AND.
- Alternativas sin resultados (CU-18 A1, RF-110). El contrato no publicaba dónde viajan, así que
  se suma al `200` de `GET /api/hoteles` un campo `alternativas`: `null` si hay resultados y, si el
  total es 0, `{"ampliar_filtros": [...], "puede_dar_de_alta": bool}`. `ampliar_filtros` lista, en
  el orden `destino_id`, `categoria`, `precio_max`, `servicio`, los filtros que vinieron aplicados
  (los que el empleado puede quitar para ampliar); `estado` y `orden` no cuentan.
  `puede_dar_de_alta` es verdadero para admin, dueño y empleado (CU-16) y falso para el freelance,
  que solo consulta (DEC-0008).
- Reseñas de un hotel: de la más reciente a la más antigua por `fecha`. `estado=oculta` solo para
  admin y dueño; el resto recibe 403. Hotel inexistente: 404. Un hotel `cerrado` también se
  puede consultar.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.datos.modelos import EstadoHotel, Hotel
from tests.fabricas import ClienteFactory, DestinoFactory, HotelFactory, ResenaFactory, crear

PROBLEM_JSON = "application/problem+json"
ROLES = ["admin", "dueno", "empleado", "freelance"]
INEXISTENTE = "00000000-0000-4000-8000-000000000000"
Fabrica = Callable[[str], Awaitable[AsyncClient]]

HOTELES = "/api/hoteles"


async def _destino(sesion: AsyncSession) -> uuid.UUID:
    return (await crear(sesion, DestinoFactory)).id


async def _hotel(sesion: AsyncSession, destino_id: uuid.UUID, nombre: str, **campos: Any) -> Hotel:
    return await crear(sesion, HotelFactory, destino_id=destino_id, nombre=nombre, **campos)


async def _resenas(
    sesion: AsyncSession, hotel: Hotel, puntajes: list[int], estado: str = "publicada"
) -> None:
    for puntaje in puntajes:
        cliente = await crear(sesion, ClienteFactory)
        extra: dict[str, Any] = {}
        if estado == "oculta":
            extra = {"estado": "oculta", "motivo_baja": "Contenido ofensivo"}
        await crear(
            sesion,
            ResenaFactory,
            hotel_id=hotel.id,
            cliente_id=cliente.id,
            puntaje=puntaje,
            **extra,
        )


def _ids(r: Any) -> list[str]:
    return [h["id"] for h in r.json()["items"]]


def _nombres(r: Any) -> list[str]:
    return [h["nombre"] for h in r.json()["items"]]


# --- Filtros (RF-106, RF-108) -----------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES)
async def test_rf106_buscar_por_destino(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    bariloche = await _destino(sesion)
    cancun = await _destino(sesion)
    llao = await _hotel(sesion, bariloche, "Llao Llao")
    await _hotel(sesion, cancun, "Riu Cancún")

    r = await c.get(HOTELES, params={"destino_id": str(bariloche)})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["total"] == 1
    assert cuerpo["pagina"] == 1
    assert cuerpo["por_pagina"] == 20
    assert _ids(r) == [str(llao.id)]
    item = cuerpo["items"][0]
    assert item["nombre"] == "Llao Llao"
    assert item["destino_id"] == str(bariloche)
    assert item["precio_referencia"] == "85000.00"
    assert item["servicios"] == ["wifi", "desayuno"]
    assert item["estado"] == "activo"
    assert item["puntaje_promedio"] is None
    assert item["cantidad_resenas"] == 0


async def test_rf106_sin_filtros_lista_todo_el_catalogo_activo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d1, d2 = await _destino(sesion), await _destino(sesion)
    await _hotel(sesion, d1, "Hotel B")
    await _hotel(sesion, d2, "Hotel A")

    r = await c.get(HOTELES)

    assert r.status_code == 200
    assert r.json()["total"] == 2
    assert _nombres(r) == ["Hotel A", "Hotel B"]  # orden por defecto: nombre


async def test_rf108_filtra_por_categoria(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    cinco = await _hotel(sesion, d, "Cinco", categoria="5 estrellas")
    await _hotel(sesion, d, "Tres", categoria="3 estrellas")
    await _hotel(sesion, d, "Sin categoria", categoria=None)

    r = await c.get(HOTELES, params={"categoria": "5 estrellas"})

    assert r.status_code == 200
    assert _ids(r) == [str(cinco.id)]
    assert r.json()["total"] == 1


async def test_rf108_categoria_no_distingue_mayusculas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    cinco = await _hotel(sesion, d, "Cinco", categoria="5 estrellas")

    r = await c.get(HOTELES, params={"categoria": "5 ESTRELLAS"})

    assert _ids(r) == [str(cinco.id)]


async def test_rf108_precio_max_es_inclusivo_y_excluye_los_sin_precio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    barato = await _hotel(sesion, d, "Barato", precio_referencia=Decimal("50000.00"))
    justo = await _hotel(sesion, d, "Justo", precio_referencia=Decimal("100000.00"))
    await _hotel(sesion, d, "Caro", precio_referencia=Decimal("100000.01"))
    await _hotel(sesion, d, "Sin precio", precio_referencia=None)

    r = await c.get(HOTELES, params={"precio_max": "100000.00"})

    assert r.status_code == 200
    assert set(_ids(r)) == {str(barato.id), str(justo.id)}
    assert r.json()["total"] == 2


async def test_rf108_filtra_por_servicio(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    con = await _hotel(sesion, d, "Con pileta", servicios=["wifi", "pileta"])
    await _hotel(sesion, d, "Sin pileta", servicios=["wifi", "desayuno"])
    await _hotel(sesion, d, "Sin servicios", servicios=[])

    r = await c.get(HOTELES, params={"servicio": "pileta"})

    assert r.status_code == 200
    assert _ids(r) == [str(con.id)]


async def test_rf108_servicio_no_distingue_mayusculas_ni_coincide_por_prefijo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    con = await _hotel(sesion, d, "Con pileta", servicios=["Wifi", "Pileta"])
    await _hotel(sesion, d, "Otro", servicios=["pileta climatizada"])

    r = await c.get(HOTELES, params={"servicio": "pileta"})

    assert _ids(r) == [str(con.id)]


async def test_rf108_un_servicio_con_coma_se_busca_entero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    con = await _hotel(sesion, d, "Con", servicios=["pileta, climatizada", "wifi"])
    await _hotel(sesion, d, "Sin", servicios=["pileta", "climatizada"])

    r = await c.get(HOTELES, params={"servicio": "pileta, climatizada"})

    assert _ids(r) == [str(con.id)]


async def test_rf108_los_filtros_se_combinan(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    otro = await _destino(sesion)
    ok = await _hotel(
        sesion,
        d,
        "Ok",
        categoria="4 estrellas",
        precio_referencia=Decimal("80000.00"),
        servicios=["wifi", "pileta"],
    )
    await _hotel(sesion, otro, "Otro destino", categoria="4 estrellas", servicios=["pileta"])
    await _hotel(sesion, d, "Otra categoria", categoria="3 estrellas", servicios=["pileta"])
    await _hotel(
        sesion,
        d,
        "Caro",
        categoria="4 estrellas",
        precio_referencia=Decimal("200000.00"),
        servicios=["pileta"],
    )
    await _hotel(sesion, d, "Sin pileta", categoria="4 estrellas", servicios=["wifi"])

    r = await c.get(
        HOTELES,
        params={
            "destino_id": str(d),
            "categoria": "4 estrellas",
            "precio_max": "90000",
            "servicio": "pileta",
        },
    )

    assert r.status_code == 200
    assert _ids(r) == [str(ok.id)]
    assert r.json()["total"] == 1


# --- Estado -----------------------------------------------------------------------------------


async def test_rf106_por_defecto_solo_los_activos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    activo = await _hotel(sesion, d, "Activo")
    await _hotel(sesion, d, "Cerrado", estado=EstadoHotel.cerrado)

    r = await c.get(HOTELES)

    assert _ids(r) == [str(activo.id)]
    assert r.json()["total"] == 1


async def test_rf106_estado_cerrado_lista_solo_los_cerrados(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "Activo")
    cerrado = await _hotel(sesion, d, "Cerrado", estado=EstadoHotel.cerrado)

    r = await c.get(HOTELES, params={"estado": "cerrado"})

    assert _ids(r) == [str(cerrado.id)]
    assert r.json()["items"][0]["estado"] == "cerrado"


# --- Promedio (RF-107) ------------------------------------------------------------------------


async def test_rf107_promedio_solo_publicadas(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    hotel = await _hotel(sesion, d, "Con reseñas")
    await _resenas(sesion, hotel, [5, 4, 4])
    await _resenas(sesion, hotel, [1, 1], estado="oculta")  # no cuentan

    r = await c.get(HOTELES)

    item = r.json()["items"][0]
    assert item["cantidad_resenas"] == 3
    assert item["puntaje_promedio"] == "4.33"


async def test_rf107_promedio_con_dos_decimales_y_texto(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    hotel = await _hotel(sesion, d, "Perfecto")
    await _resenas(sesion, hotel, [5, 5])

    r = await c.get(HOTELES)

    assert r.json()["items"][0]["puntaje_promedio"] == "5.00"


async def test_rf107_hotel_sin_resenas_publicadas_tiene_promedio_vacio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    solo_ocultas = await _hotel(sesion, d, "Solo ocultas")
    await _resenas(sesion, solo_ocultas, [2, 3], estado="oculta")

    r = await c.get(HOTELES)

    item = r.json()["items"][0]
    assert item["puntaje_promedio"] is None
    assert item["cantidad_resenas"] == 0


async def test_rf107_cada_hotel_trae_su_propio_resumen(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    a = await _hotel(sesion, d, "A")
    b = await _hotel(sesion, d, "B")
    await _hotel(sesion, d, "C")
    await _resenas(sesion, a, [5, 3])
    await _resenas(sesion, b, [2])

    r = await c.get(HOTELES)

    por_nombre = {h["nombre"]: h for h in r.json()["items"]}
    assert (por_nombre["A"]["puntaje_promedio"], por_nombre["A"]["cantidad_resenas"]) == ("4.00", 2)
    assert (por_nombre["B"]["puntaje_promedio"], por_nombre["B"]["cantidad_resenas"]) == ("2.00", 1)
    assert (por_nombre["C"]["puntaje_promedio"], por_nombre["C"]["cantidad_resenas"]) == (None, 0)


async def test_rf107_el_filtro_por_servicio_no_altera_el_promedio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """El join con las reseñas no puede duplicar filas ni inflar el total."""
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    hotel = await _hotel(sesion, d, "Con pileta", servicios=["wifi", "pileta"])
    await _resenas(sesion, hotel, [5, 3, 4])

    r = await c.get(HOTELES, params={"servicio": "pileta"})

    assert r.json()["total"] == 1
    assert len(r.json()["items"]) == 1
    assert r.json()["items"][0]["cantidad_resenas"] == 3
    assert r.json()["items"][0]["puntaje_promedio"] == "4.00"


async def test_rf107_el_resumen_de_resenas_no_hace_n_mas_1(
    cliente_como: Fabrica, sesion: AsyncSession, motor: AsyncEngine
) -> None:
    """Las sentencias SQL del listado no crecen con la cantidad de hoteles (nota de T-076)."""
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    sentencias: list[str] = []

    def capturar(_conn: Any, _cursor: Any, sentencia: str, *_resto: Any) -> None:
        sentencias.append(sentencia)

    async def contar() -> int:
        sentencias.clear()
        event.listen(motor.sync_engine, "before_cursor_execute", capturar)
        try:
            r = await c.get(HOTELES, params={"por_pagina": 100})
        finally:
            event.remove(motor.sync_engine, "before_cursor_execute", capturar)
        assert r.status_code == 200
        return len(sentencias)

    for n in range(3):
        await _resenas(sesion, await _hotel(sesion, d, f"Hotel {n:02d}"), [5, 4])
    con_3 = await contar()
    for n in range(3, 10):
        await _resenas(sesion, await _hotel(sesion, d, f"Hotel {n:02d}"), [5, 4])
    con_10 = await contar()

    assert con_3 > 0
    assert con_10 == con_3


# --- Orden (RF-109) ---------------------------------------------------------------------------


async def test_rf109_orden_por_valoracion(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    regular = await _hotel(sesion, d, "Aaa regular")
    excelente = await _hotel(sesion, d, "Zzz excelente")
    bueno = await _hotel(sesion, d, "Mmm bueno")
    await _resenas(sesion, regular, [3, 3])
    await _resenas(sesion, excelente, [5, 5])
    await _resenas(sesion, bueno, [4, 5])

    r = await c.get(HOTELES, params={"orden": "valoracion"})

    assert r.status_code == 200
    assert _ids(r) == [str(excelente.id), str(bueno.id), str(regular.id)]


async def test_rf109_orden_por_valoracion_ignora_las_resenas_ocultas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    a = await _hotel(sesion, d, "A")
    b = await _hotel(sesion, d, "B")
    await _resenas(sesion, a, [4])
    await _resenas(sesion, a, [5, 5], estado="oculta")  # con ellas A pasaría a B
    await _resenas(sesion, b, [3])

    r = await c.get(HOTELES, params={"orden": "valoracion"})

    assert _ids(r) == [str(a.id), str(b.id)]


async def test_rf109_los_hoteles_sin_resenas_van_al_final(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    sin = await _hotel(sesion, d, "A sin reseñas")
    solo_ocultas = await _hotel(sesion, d, "B solo ocultas")
    malo = await _hotel(sesion, d, "Z malo")
    await _resenas(sesion, solo_ocultas, [5], estado="oculta")
    await _resenas(sesion, malo, [1])

    r = await c.get(HOTELES, params={"orden": "valoracion"})

    assert _ids(r) == [str(malo.id), str(sin.id), str(solo_ocultas.id)]


async def test_rf109_desempate_estable_por_nombre(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    z = await _hotel(sesion, d, "Zeta")
    a = await _hotel(sesion, d, "Alfa")
    m = await _hotel(sesion, d, "Mu")
    for hotel in (z, a, m):
        await _resenas(sesion, hotel, [4])

    primera = await c.get(HOTELES, params={"orden": "valoracion"})
    segunda = await c.get(HOTELES, params={"orden": "valoracion"})

    assert _ids(primera) == [str(a.id), str(m.id), str(z.id)]
    assert _ids(segunda) == _ids(primera)


async def test_rf109_la_paginacion_con_empates_no_repite_ni_saltea(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    hoteles = [await _hotel(sesion, d, f"Hotel {n}") for n in range(5)]
    for hotel in hoteles:
        await _resenas(sesion, hotel, [4])

    vistos: list[str] = []
    for pagina in (1, 2, 3):
        r = await c.get(HOTELES, params={"orden": "valoracion", "pagina": pagina, "por_pagina": 2})
        vistos += _ids(r)

    assert sorted(vistos) == sorted(str(h.id) for h in hoteles)
    assert len(set(vistos)) == 5


async def test_rf109_orden_por_nombre(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "Charlie")
    await _hotel(sesion, d, "Alfa")
    await _hotel(sesion, d, "Bravo")

    r = await c.get(HOTELES, params={"orden": "nombre"})

    assert _nombres(r) == ["Alfa", "Bravo", "Charlie"]


async def test_rf109_orden_por_precio_ascendente_y_sin_precio_al_final(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "A sin precio", precio_referencia=None)
    await _hotel(sesion, d, "B caro", precio_referencia=Decimal("200000.00"))
    await _hotel(sesion, d, "C barato", precio_referencia=Decimal("50000.00"))

    r = await c.get(HOTELES, params={"orden": "precio"})

    assert _nombres(r) == ["C barato", "B caro", "A sin precio"]


# --- Paginación -------------------------------------------------------------------------------


async def test_rf106_paginacion(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    for n in range(5):
        await _hotel(sesion, d, f"Hotel {n}")

    primera = await c.get(HOTELES, params={"pagina": 1, "por_pagina": 2})
    ultima = await c.get(HOTELES, params={"pagina": 3, "por_pagina": 2})
    fuera = await c.get(HOTELES, params={"pagina": 4, "por_pagina": 2})

    assert primera.json()["total"] == 5
    assert primera.json()["pagina"] == 1
    assert primera.json()["por_pagina"] == 2
    assert _nombres(primera) == ["Hotel 0", "Hotel 1"]
    assert _nombres(ultima) == ["Hotel 4"]
    assert fuera.status_code == 200
    assert fuera.json()["items"] == []
    assert fuera.json()["total"] == 5


@pytest.mark.parametrize("rol", ROLES)
async def test_rf106_los_cuatro_roles_pueden_buscar(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    d = await _destino(sesion)
    await _hotel(sesion, d, "Hotel Sol")

    r = await c.get(HOTELES)

    assert r.status_code == 200
    assert r.json()["total"] == 1


# --- Alternativas sin resultados (RF-110, CU-18 A1) ---------------------------------------------


async def test_rf110_contrato_publica_alternativas_en_la_respuesta(
    cliente_sin_sesion: AsyncClient,
) -> None:
    r = await cliente_sin_sesion.get("/api/openapi.json")
    esquema = r.json()["paths"][HOTELES]["get"]["responses"]["200"]["content"]["application/json"][
        "schema"
    ]

    assert "alternativas" in esquema["properties"]
    assert "alternativas" not in esquema["required"]


async def test_rf110_alternativas(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "Hotel Sol", categoria="3 estrellas", servicios=["wifi"])

    r = await c.get(
        HOTELES, params={"destino_id": str(d), "categoria": "5 estrellas", "servicio": "spa"}
    )

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["items"] == []
    assert cuerpo["total"] == 0
    assert cuerpo["alternativas"] == {
        "ampliar_filtros": ["destino_id", "categoria", "servicio"],
        "puede_dar_de_alta": True,
    }


async def test_rf110_ampliar_filtros_lista_los_cuatro_en_orden(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    d = await _destino(sesion)

    r = await c.get(
        HOTELES,
        params={
            "servicio": "spa",
            "precio_max": "1000",
            "categoria": "5 estrellas",
            "destino_id": str(d),
            "orden": "valoracion",
        },
    )

    assert r.json()["alternativas"]["ampliar_filtros"] == [
        "destino_id",
        "categoria",
        "precio_max",
        "servicio",
    ]


async def test_rf110_catalogo_vacio_sin_filtros_solo_ofrece_dar_de_alta(
    cliente_como: Fabrica,
) -> None:
    c = await cliente_como("dueno")

    r = await c.get(HOTELES)

    assert r.status_code == 200
    assert r.json()["total"] == 0
    assert r.json()["alternativas"] == {"ampliar_filtros": [], "puede_dar_de_alta": True}


async def test_rf110_estado_y_orden_no_cuentan_como_filtros_a_ampliar(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "Activo")

    r = await c.get(HOTELES, params={"estado": "cerrado", "orden": "precio"})

    assert r.json()["total"] == 0
    assert r.json()["alternativas"]["ampliar_filtros"] == []


async def test_rf110_el_freelance_no_puede_dar_de_alta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")

    r = await c.get(HOTELES, params={"destino_id": str(await _destino(sesion))})

    assert r.status_code == 200
    assert r.json()["alternativas"] == {
        "ampliar_filtros": ["destino_id"],
        "puede_dar_de_alta": False,
    }


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado"])
async def test_rf110_los_roles_de_catalogo_pueden_dar_de_alta(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.get(HOTELES, params={"categoria": "7 estrellas"})

    assert r.json()["alternativas"]["puede_dar_de_alta"] is True


async def test_rf110_con_resultados_no_hay_alternativas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "Hotel Sol")

    r = await c.get(HOTELES, params={"destino_id": str(d)})

    assert r.json()["total"] == 1
    assert r.json()["alternativas"] is None


async def test_rf110_una_pagina_vacia_fuera_de_rango_no_es_sin_resultados(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    d = await _destino(sesion)
    await _hotel(sesion, d, "Hotel Sol")

    r = await c.get(HOTELES, params={"pagina": 2, "por_pagina": 5})

    assert r.json()["items"] == []
    assert r.json()["total"] == 1
    assert r.json()["alternativas"] is None


# --- Reseñas del hotel (CU-18 paso 3, CU-29 A1) -------------------------------------------------


def _url_resenas(hotel_id: uuid.UUID | str) -> str:
    return f"/api/hoteles/{hotel_id}/resenas"


async def _con_resenas(sesion: AsyncSession) -> Hotel:
    d = await _destino(sesion)
    hotel = await _hotel(sesion, d, "Hotel Sol")
    cliente = await crear(sesion, ClienteFactory)
    for fecha, puntaje, extra in [
        (date(2026, 1, 10), 3, {}),
        (date(2026, 3, 5), 5, {}),
        (date(2026, 2, 1), 4, {}),
        (date(2026, 4, 1), 1, {"estado": "oculta", "motivo_baja": "Ofensiva"}),
    ]:
        await crear(
            sesion,
            ResenaFactory,
            hotel_id=hotel.id,
            cliente_id=cliente.id,
            puntaje=puntaje,
            fecha=fecha,
            **extra,
        )
    return hotel


@pytest.mark.parametrize("rol", ROLES)
async def test_rf107_resenas_del_hotel_publicadas_por_defecto(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    hotel = await _con_resenas(sesion)

    r = await c.get(_url_resenas(hotel.id))

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["total"] == 3
    assert cuerpo["pagina"] == 1
    assert cuerpo["por_pagina"] == 20
    assert [x["fecha"] for x in cuerpo["items"]] == ["2026-03-05", "2026-02-01", "2026-01-10"]
    assert [x["puntaje"] for x in cuerpo["items"]] == [5, 4, 3]
    assert {x["estado"] for x in cuerpo["items"]} == {"publicada"}
    assert {x["hotel_id"] for x in cuerpo["items"]} == {str(hotel.id)}
    assert {"id", "cliente_id", "comentario", "motivo_baja"} <= set(cuerpo["items"][0])


async def test_rf107_resenas_solo_las_del_hotel_pedido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _con_resenas(sesion)
    otro = await _hotel(sesion, await _destino(sesion), "Otro")
    await _resenas(sesion, otro, [2, 2, 2])

    r = await c.get(_url_resenas(hotel.id))

    assert r.json()["total"] == 3


async def test_rf107_resenas_paginadas(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    hotel = await _con_resenas(sesion)

    p1 = await c.get(_url_resenas(hotel.id), params={"pagina": 1, "por_pagina": 2})
    p2 = await c.get(_url_resenas(hotel.id), params={"pagina": 2, "por_pagina": 2})

    assert p1.json()["total"] == 3
    assert [x["puntaje"] for x in p1.json()["items"]] == [5, 4]
    assert [x["puntaje"] for x in p2.json()["items"]] == [3]
    assert p2.json()["por_pagina"] == 2


async def test_rf107_hotel_sin_resenas_devuelve_pagina_vacia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion, await _destino(sesion), "Sin reseñas")

    r = await c.get(_url_resenas(hotel.id))

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_cu29_a1_las_ocultas_las_ven_admin_y_dueno(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    hotel = await _con_resenas(sesion)

    r = await c.get(_url_resenas(hotel.id), params={"estado": "oculta"})

    assert r.status_code == 200
    assert r.json()["total"] == 1
    item = r.json()["items"][0]
    assert item["estado"] == "oculta"
    assert item["motivo_baja"] == "Ofensiva"


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_cu29_a1_estado_publicada_explicito_lo_puede_pedir_cualquiera(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    hotel = await _con_resenas(sesion)

    r = await c.get(_url_resenas(hotel.id), params={"estado": "publicada"})

    assert r.status_code == 200
    assert r.json()["total"] == 3


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_cu29_a1_las_ocultas_son_403_para_empleado_y_freelance(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    hotel = await _con_resenas(sesion)

    r = await c.get(_url_resenas(hotel.id), params={"estado": "oculta"})

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 403


@pytest.mark.parametrize("rol", ROLES)
async def test_rf107_resenas_de_hotel_inexistente_404(cliente_como: Fabrica, rol: str) -> None:
    c = await cliente_como(rol)

    r = await c.get(_url_resenas(INEXISTENTE))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 404


async def test_rf107_resenas_de_un_hotel_cerrado_se_pueden_consultar(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    hotel = await _hotel(sesion, await _destino(sesion), "Cerrado", estado=EstadoHotel.cerrado)
    await _resenas(sesion, hotel, [4])

    r = await c.get(_url_resenas(hotel.id))

    assert r.status_code == 200
    assert r.json()["total"] == 1
