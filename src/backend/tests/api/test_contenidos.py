"""T-130: tablero de contenido en redes (CU-19, RF-113 a RF-118, RF-153, DEC-0013).

Reglas del PATCH (EST-ContenidoRed, publicadas en el contrato):

- Movimientos válidos: idea <-> en_produccion, en_produccion <-> listo y listo -> publicado
  (retroceder es A5, marcar publicada a mano es A3). Cualquier otro cambio de estado: 409.
- Una pieza `publicado` o `descartado` no admite ningún cambio, ni de fecha: 409.
- `descartado` no se alcanza por PATCH (409): solo con `POST /contenidos/{id}/descartar` (A4).
- `GET /contenidos` no trae las `descartado` salvo con `estado_kanban=descartado`.
"""

from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import CanalContenido, ContenidoRed, EstadoKanban, Usuario
from tests.fabricas import ContenidoRedFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
INEXISTENTE = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
NUEVA = {
    "titulo": "Tres playas del Caribe",
    "texto": "Arena blanca y agua tibia.",
    "canal": "instagram",
    "fecha_publicacion": "2026-12-01",
}


async def _con_redes(cliente_como: FabricaCliente, rol: str = "empleado") -> AsyncClient:
    c = await cliente_como(rol)
    c.usuario.acceso_redes = True  # type: ignore[attr-defined]
    return c


def _yo(c: AsyncClient) -> Usuario:
    return c.usuario  # type: ignore[attr-defined,no-any-return]


async def _pieza(
    sesion: AsyncSession, autor: Usuario, estado: str = "idea", **campos: Any
) -> ContenidoRed:
    return await crear(
        sesion,
        ContenidoRedFactory,
        usuario_id=autor.id,
        estado_kanban=EstadoKanban(estado),
        **campos,
    )


def _ids(r: Response) -> list[str]:
    return [p["id"] for p in r.json()["items"]]


# --- RF-113: crear, ver, editar ---------------------------------------------------------------


async def test_rf113_crear(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await _con_redes(cliente_como)
    await sesion.flush()

    r = await c.post("/api/contenidos", json=NUEVA)

    assert r.status_code == 201
    pieza = r.json()
    assert pieza["estado_kanban"] == "idea"
    assert pieza["usuario_id"] == str(_yo(c).id)
    assert pieza["titulo"] == NUEVA["titulo"]
    assert pieza["texto"] == NUEVA["texto"]
    assert pieza["canal"] == "instagram"
    assert pieza["fecha_publicacion"] == "2026-12-01"
    assert (await c.get(f"/api/contenidos/{pieza['id']}")).json() == pieza


async def test_rf113_crear_sin_texto_es_una_idea_con_texto_vacio(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    await sesion.flush()
    cuerpo = {k: v for k, v in NUEVA.items() if k != "texto"}

    r = await c.post("/api/contenidos", json=cuerpo)

    assert r.status_code == 201
    assert r.json()["texto"] is None
    assert r.json()["estado_kanban"] == "idea"


@pytest.mark.parametrize("faltante", ["titulo", "canal", "fecha_publicacion"])
async def test_rf113_crear_sin_dato_obligatorio_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, faltante: str
) -> None:
    c = await _con_redes(cliente_como)
    await sesion.flush()

    r = await c.post("/api/contenidos", json={k: v for k, v in NUEVA.items() if k != faltante})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf113_ver_una_pieza(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), texto="Cuerpo", canal=CanalContenido.tiktok)

    r = await c.get(f"/api/contenidos/{pieza.id}")

    assert r.status_code == 200
    assert r.json()["id"] == str(pieza.id)
    assert r.json()["canal"] == "tiktok"
    assert r.json()["texto"] == "Cuerpo"


async def test_rf113_pieza_inexistente_404_en_ver_editar_y_descartar(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    await sesion.flush()

    for r in (
        await c.get(f"/api/contenidos/{INEXISTENTE}"),
        await c.patch(f"/api/contenidos/{INEXISTENTE}", json={"titulo": "x"}),
        await c.post(f"/api/contenidos/{INEXISTENTE}/descartar"),
    ):
        assert r.status_code == 404
        assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf113_editar_titulo_texto_y_canal(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c))

    r = await c.patch(
        f"/api/contenidos/{pieza.id}",
        json={"titulo": "Nuevo título", "texto": "Nuevo texto", "canal": "tiktok"},
    )

    assert r.status_code == 200
    assert r.json()["titulo"] == "Nuevo título"
    assert r.json()["texto"] == "Nuevo texto"
    assert r.json()["canal"] == "tiktok"
    assert r.json()["estado_kanban"] == "idea"
    assert (await c.get(f"/api/contenidos/{pieza.id}")).json()["titulo"] == "Nuevo título"


async def test_rf113_editar_con_cuerpo_vacio_no_cambia_nada(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c))

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={})

    assert r.status_code == 200
    assert r.json()["titulo"] == pieza.titulo
    assert r.json()["estado_kanban"] == "idea"


async def test_rf113_el_tablero_es_compartido_por_quienes_tienen_acceso(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """DEC-0013: el acceso a redes es una capacidad del módulo, no de la autoría de la pieza."""
    c = await _con_redes(cliente_como, "empleado")
    otro = await _con_redes(cliente_como, "dueno")
    pieza = await _pieza(sesion, _yo(otro))

    assert (await c.get(f"/api/contenidos/{pieza.id}")).status_code == 200
    assert (await c.patch(f"/api/contenidos/{pieza.id}", json={"titulo": "Y"})).status_code == 200


# --- RF-114: mover por el kanban --------------------------------------------------------------


@pytest.mark.parametrize(
    ("origen", "destino"),
    [
        ("idea", "en_produccion"),
        ("en_produccion", "listo"),
        ("en_produccion", "idea"),
        ("listo", "en_produccion"),
        ("listo", "publicado"),
    ],
)
async def test_rf114_mover_por_el_kanban(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: str, destino: str
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), origen)

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": destino})

    assert r.status_code == 200
    assert r.json()["estado_kanban"] == destino
    assert (await c.get(f"/api/contenidos/{pieza.id}")).json()["estado_kanban"] == destino


async def test_rf114_retroceder_una_tarjeta_a5(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), "listo")

    r1 = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": "en_produccion"})
    r2 = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": "idea"})

    assert r1.json()["estado_kanban"] == "en_produccion"
    assert r2.json()["estado_kanban"] == "idea"


async def test_rf114_marcar_publicada_a_mano_a3(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """RF-118: pasar a `publicado` solo cambia el estado; Rumbo no sale a ninguna red."""
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), "listo")

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": "publicado"})

    assert r.status_code == 200
    assert r.json()["estado_kanban"] == "publicado"


@pytest.mark.parametrize(
    ("origen", "destino"),
    [
        ("idea", "listo"),
        ("idea", "publicado"),
        ("en_produccion", "publicado"),
        ("listo", "idea"),
    ],
)
async def test_rf114_salto_de_columna_invalido_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: str, destino: str
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), origen)

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": destino})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get(f"/api/contenidos/{pieza.id}")).json()["estado_kanban"] == origen


@pytest.mark.parametrize("origen", ["idea", "en_produccion", "listo"])
async def test_rf114_descartado_no_se_alcanza_por_patch_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: str
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), origen)

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": "descartado"})

    assert r.status_code == 409
    assert (await c.get(f"/api/contenidos/{pieza.id}")).json()["estado_kanban"] == origen


@pytest.mark.parametrize("estado", ["publicado", "descartado"])
@pytest.mark.parametrize(
    "cambios",
    [
        {"titulo": "Otro"},
        {"fecha_publicacion": "2027-01-01"},
        {"estado_kanban": "idea"},
        {"estado_kanban": "en_produccion"},
        {},
    ],
)
async def test_rf114_publicado_y_descartado_no_admiten_cambios_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: str, cambios: dict[str, str]
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), estado)

    r = await c.patch(f"/api/contenidos/{pieza.id}", json=cambios)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    despues = (await c.get(f"/api/contenidos/{pieza.id}")).json()
    assert despues["titulo"] == pieza.titulo
    assert despues["estado_kanban"] == estado
    assert despues["fecha_publicacion"] == pieza.fecha_publicacion.isoformat()


async def test_rf114_estado_desconocido_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c))

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"estado_kanban": "archivado"})

    assert r.status_code == 422


async def test_rf114_mismo_estado_en_una_pieza_abierta_no_es_error(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), "en_produccion")

    r = await c.patch(
        f"/api/contenidos/{pieza.id}",
        json={"estado_kanban": "en_produccion", "titulo": "Mismo estado"},
    )

    assert r.status_code == 200
    assert r.json()["estado_kanban"] == "en_produccion"
    assert r.json()["titulo"] == "Mismo estado"


# --- RF-115: reprogramar ----------------------------------------------------------------------


@pytest.mark.parametrize("estado", ["idea", "en_produccion", "listo"])
async def test_rf115_reprogramar(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: str
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), estado, fecha_publicacion=date(2026, 11, 5))

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"fecha_publicacion": "2026-12-24"})

    assert r.status_code == 200
    assert r.json()["fecha_publicacion"] == "2026-12-24"
    assert r.json()["estado_kanban"] == estado
    assert (await c.get(f"/api/contenidos/{pieza.id}")).json()["fecha_publicacion"] == "2026-12-24"


async def test_rf115_reprogramar_y_mover_en_el_mismo_pedido(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), "idea")

    r = await c.patch(
        f"/api/contenidos/{pieza.id}",
        json={"estado_kanban": "en_produccion", "fecha_publicacion": "2026-12-05"},
    )

    assert r.status_code == 200
    assert r.json()["estado_kanban"] == "en_produccion"
    assert r.json()["fecha_publicacion"] == "2026-12-05"


async def test_rf115_fecha_invalida_422(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c))

    r = await c.patch(f"/api/contenidos/{pieza.id}", json={"fecha_publicacion": "mañana"})

    assert r.status_code == 422


async def test_rf115_un_pedido_con_movimiento_invalido_no_aplica_los_demas_cambios(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), "idea", fecha_publicacion=date(2026, 11, 5))

    r = await c.patch(
        f"/api/contenidos/{pieza.id}",
        json={"estado_kanban": "listo", "fecha_publicacion": "2026-12-24"},
    )

    assert r.status_code == 409
    despues = (await c.get(f"/api/contenidos/{pieza.id}")).json()
    assert despues["fecha_publicacion"] == "2026-11-05"
    assert despues["estado_kanban"] == "idea"


# --- RF-116: tablero y calendario -------------------------------------------------------------


async def test_rf116_calendario(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await _con_redes(cliente_como)
    yo = _yo(c)
    tarde = await _pieza(sesion, yo, "idea", fecha_publicacion=date(2026, 12, 20))
    temprano = await _pieza(sesion, yo, "listo", fecha_publicacion=date(2026, 11, 2))
    medio = await _pieza(sesion, yo, "publicado", fecha_publicacion=date(2026, 11, 20))

    r = await c.get("/api/contenidos")

    assert r.status_code == 200
    assert r.json()["total"] == 3
    assert _ids(r) == [str(temprano.id), str(medio.id), str(tarde.id)]


async def test_rf116_calendario_filtra_por_periodo_inclusive(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    yo = _yo(c)
    await _pieza(sesion, yo, fecha_publicacion=date(2026, 10, 31))
    inicio = await _pieza(sesion, yo, fecha_publicacion=date(2026, 11, 1))
    fin = await _pieza(sesion, yo, fecha_publicacion=date(2026, 11, 30))
    await _pieza(sesion, yo, fecha_publicacion=date(2026, 12, 1))

    r = await c.get("/api/contenidos", params={"desde": "2026-11-01", "hasta": "2026-11-30"})

    assert _ids(r) == [str(inicio.id), str(fin.id)]
    assert r.json()["total"] == 2


async def test_rf116_tablero_filtra_por_columna_y_canal(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    yo = _yo(c)
    listo_ig = await _pieza(sesion, yo, "listo", canal=CanalContenido.instagram)
    await _pieza(sesion, yo, "listo", canal=CanalContenido.tiktok)
    await _pieza(sesion, yo, "idea", canal=CanalContenido.instagram)

    por_columna = await c.get("/api/contenidos", params={"estado_kanban": "listo"})
    combinado = await c.get(
        "/api/contenidos", params={"estado_kanban": "listo", "canal": "instagram"}
    )

    assert por_columna.json()["total"] == 2
    assert _ids(combinado) == [str(listo_ig.id)]


async def test_rf116_pagina_el_listado(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await _con_redes(cliente_como)
    yo = _yo(c)
    for dia in (1, 2, 3):
        await _pieza(sesion, yo, fecha_publicacion=date(2026, 11, dia))

    r = await c.get("/api/contenidos", params={"pagina": 2, "por_pagina": 2})

    assert r.json()["total"] == 3
    assert r.json()["pagina"] == 2
    assert r.json()["por_pagina"] == 2
    assert len(r.json()["items"]) == 1


async def test_rf116_listado_vacio(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await _con_redes(cliente_como)
    await sesion.flush()

    r = await c.get("/api/contenidos")

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


# --- RF-117: descartar (baja lógica) ----------------------------------------------------------


@pytest.mark.parametrize("estado", ["idea", "en_produccion", "listo"])
async def test_rf117_descartar(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: str
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), estado)

    r = await c.post(f"/api/contenidos/{pieza.id}/descartar")

    assert r.status_code == 200
    assert r.json()["estado_kanban"] == "descartado"
    assert r.json()["id"] == str(pieza.id)


async def test_rf117_descartar_es_baja_logica_la_pieza_sigue_existiendo(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c))

    await c.post(f"/api/contenidos/{pieza.id}/descartar")

    r = await c.get(f"/api/contenidos/{pieza.id}")
    assert r.status_code == 200
    assert r.json()["estado_kanban"] == "descartado"
    assert r.json()["titulo"] == pieza.titulo


async def test_rf117_el_listado_no_trae_descartadas_salvo_con_filtro(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    yo = _yo(c)
    viva = await _pieza(sesion, yo, "idea")
    descartada = await _pieza(sesion, yo, "descartado")

    por_defecto = await c.get("/api/contenidos")
    con_filtro = await c.get("/api/contenidos", params={"estado_kanban": "descartado"})

    assert _ids(por_defecto) == [str(viva.id)]
    assert por_defecto.json()["total"] == 1
    assert _ids(con_filtro) == [str(descartada.id)]


async def test_rf117_descartar_la_saca_del_tablero(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c))

    await c.post(f"/api/contenidos/{pieza.id}/descartar")

    assert _ids(await c.get("/api/contenidos")) == []


@pytest.mark.parametrize("estado", ["publicado", "descartado"])
async def test_rf117_no_se_descarta_lo_publicado_ni_lo_ya_descartado_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: str
) -> None:
    c = await _con_redes(cliente_como)
    pieza = await _pieza(sesion, _yo(c), estado)

    r = await c.post(f"/api/contenidos/{pieza.id}/descartar")

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get(f"/api/contenidos/{pieza.id}")).json()["estado_kanban"] == estado


# --- RF-153 / RF-118: acceso y sin publicación ------------------------------------------------

RUTAS = [
    ("get", "/api/contenidos", None),
    ("post", "/api/contenidos", NUEVA),
    ("get", f"/api/contenidos/{INEXISTENTE}", None),
    ("patch", f"/api/contenidos/{INEXISTENTE}", {"titulo": "x"}),
    ("post", f"/api/contenidos/{INEXISTENTE}/descartar", None),
]


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS)
async def test_sin_acceso_403(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    metodo: str,
    ruta: str,
    cuerpo: Any,
) -> None:
    c = await cliente_como("empleado")
    c.usuario.acceso_redes = False  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("acceso_redes", [True, False])
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS)
async def test_sin_acceso_403_freelance_nunca_entra(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    acceso_redes: bool,
    metodo: str,
    ruta: str,
    cuerpo: Any,
) -> None:
    c = await cliente_como("freelance")
    c.usuario.acceso_redes = acceso_redes  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 403


async def test_sin_acceso_403_no_modifica_la_pieza(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    con = await _con_redes(cliente_como, "dueno")
    pieza = await _pieza(sesion, _yo(con))
    sin = await cliente_como("empleado")
    sin.usuario.acceso_redes = False  # type: ignore[attr-defined]
    await sesion.flush()

    r = await sin.post(f"/api/contenidos/{pieza.id}/descartar")

    assert r.status_code == 403
    assert (await con.get(f"/api/contenidos/{pieza.id}")).json()["estado_kanban"] == "idea"


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf153_admin_y_dueno_entran_por_rol_sin_la_capacidad(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    c.usuario.acceso_redes = False  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.get("/api/contenidos")

    assert r.status_code == 200


async def test_rf153_empleado_con_acceso_entra(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await _con_redes(cliente_como, "empleado")
    await sesion.flush()

    assert (await c.get("/api/contenidos")).status_code == 200


async def test_rf118_no_existe_ninguna_ruta_de_publicacion(
    cliente_sin_sesion: AsyncClient,
) -> None:
    rutas = (await cliente_sin_sesion.get("/api/openapi.json")).json()["paths"]

    assert not [r for r in rutas if "publicar" in r]


async def test_rf113_editar_registra_quien_modifico_y_conserva_quien_creo(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    autor = await _con_redes(cliente_como, "empleado")
    otro = await _con_redes(cliente_como, "dueno")
    await sesion.flush()
    creada = (await autor.post("/api/contenidos", json=NUEVA)).json()

    r = await otro.patch(f"/api/contenidos/{creada['id']}", json={"titulo": "Cambiado"})

    assert r.status_code == 200
    assert r.json()["created_by"] == str(_yo(autor).id)
    assert r.json()["updated_by"] == str(_yo(otro).id)
