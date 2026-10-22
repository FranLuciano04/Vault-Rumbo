"""T-031: catálogo de destinos (CU-26, RF-089, RF-090, RF-091, RF-092, RF-153, DEC-0006).

El 401/403 por rol de las rutas ya lo cubre `test_contrato_m1.py`; el rol del servicio,
`tests/negocio/test_destinos.py`. Acá se fija el comportamiento. Supuestos: el nombre duplicado
se compara normalizado (sin tildes, mayúsculas ni espacios de más) contra TODOS los destinos,
activos e inactivos; el listado va ordenado por nombre; `buscar` mira nombre y país.
"""

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Destino
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
Fabrica = Callable[[str], Awaitable[AsyncClient]]
CUERPO = {"nombre": "Bariloche", "pais": "Argentina", "region": "Patagonia", "notas": "Nieve"}
INEXISTENTE = "00000000-0000-4000-8000-000000000000"


def _url(destino_id: uuid.UUID | str) -> str:
    return f"/api/destinos/{destino_id}"


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Destino))).scalar_one()


async def _destino(sesion: AsyncSession, **campos: Any) -> Destino:
    return await crear(sesion, DestinoFactory, activo=True, **campos)


def _ids(cuerpo: dict[str, Any]) -> list[str]:
    return [d["id"] for d in cuerpo["items"]]


# --- Alta y listado (RF-089) ---------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf089_alta_y_listado(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)

    r = await c.post("/api/destinos", json=CUERPO)

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["nombre"] == "Bariloche"
    assert cuerpo["pais"] == "Argentina"
    assert cuerpo["region"] == "Patagonia"
    assert cuerpo["notas"] == "Nieve"
    assert cuerpo["activo"] is True
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = await sesion.get(Destino, uuid.UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.nombre == "Bariloche"
    assert fila.activo is True

    listado = await c.get("/api/destinos", params={"buscar": "Bariloche"})
    assert listado.status_code == 200
    assert _ids(listado.json()) == [cuerpo["id"]]


async def test_rf089_alta_solo_con_nombre_y_pais(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post("/api/destinos", json={"nombre": "Salta", "pais": "Argentina"})

    assert r.status_code == 201
    assert r.json()["region"] is None
    assert r.json()["notas"] is None


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"pais": "Argentina"},
        {"nombre": "Salta"},
        {"nombre": "", "pais": "Argentina"},
        {"nombre": "Salta", "pais": ""},
        {"nombre": "x" * 121, "pais": "Argentina"},
    ],
)
async def test_rf089_alta_invalida_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, str]
) -> None:
    c = await cliente_como("admin")

    r = await c.post("/api/destinos", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf089_listado_trae_solo_activos_por_defecto(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    activo = await _destino(sesion, nombre="Mendoza")
    await crear(sesion, DestinoFactory, nombre="Ushuaia", activo=False)
    c = await cliente_como("admin")

    r = await c.get("/api/destinos")

    assert r.status_code == 200
    cuerpo = r.json()
    assert _ids(cuerpo) == [str(activo.id)]
    assert cuerpo["total"] == 1
    assert cuerpo["pagina"] == 1
    assert "por_pagina" in cuerpo


async def test_rf089_listado_filtra_inactivos(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    await _destino(sesion, nombre="Mendoza")
    inactivo = await crear(sesion, DestinoFactory, nombre="Ushuaia", activo=False)
    c = await cliente_como("admin")

    r = await c.get("/api/destinos", params={"activo": "false"})

    assert r.status_code == 200
    assert _ids(r.json()) == [str(inactivo.id)]
    assert r.json()["total"] == 1


async def test_rf089_listado_activo_true_explicito(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    activo = await _destino(sesion, nombre="Mendoza")
    await crear(sesion, DestinoFactory, nombre="Ushuaia", activo=False)
    c = await cliente_como("admin")

    r = await c.get("/api/destinos", params={"activo": "true"})

    assert _ids(r.json()) == [str(activo.id)]


async def test_rf089_listado_ordenado_por_nombre(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    b = await _destino(sesion, nombre="Bariloche")
    cancun = await _destino(sesion, nombre="Cancún")
    a = await _destino(sesion, nombre="Aruba")
    c = await cliente_como("admin")

    r = await c.get("/api/destinos")

    assert _ids(r.json()) == [str(a.id), str(b.id), str(cancun.id)]


async def test_rf089_listado_pagina(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    for nombre in ("Aruba", "Bariloche", "Cancún"):
        await _destino(sesion, nombre=nombre)
    c = await cliente_como("admin")

    r = await c.get("/api/destinos", params={"pagina": 2, "por_pagina": 2})

    assert r.status_code == 200
    assert r.json()["total"] == 3
    assert r.json()["pagina"] == 2
    assert len(r.json()["items"]) == 1
    assert r.json()["items"][0]["nombre"] == "Cancún"


async def test_rf089_buscar_por_nombre_sin_distinguir_mayusculas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    buscado = await _destino(sesion, nombre="San Carlos de Bariloche", pais="Argentina")
    await _destino(sesion, nombre="Cancún", pais="México")
    c = await cliente_como("admin")

    r = await c.get("/api/destinos", params={"buscar": "BARILOCHE"})

    assert _ids(r.json()) == [str(buscado.id)]
    assert r.json()["total"] == 1


async def test_rf089_buscar_por_pais(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    mexico = await _destino(sesion, nombre="Cancún", pais="México")
    await _destino(sesion, nombre="Salta", pais="Argentina")
    c = await cliente_como("admin")

    r = await c.get("/api/destinos", params={"buscar": "méxico"})

    assert _ids(r.json()) == [str(mexico.id)]


async def test_rf089_buscar_sin_resultados(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    await _destino(sesion, nombre="Salta")
    c = await cliente_como("admin")

    r = await c.get("/api/destinos", params={"buscar": "zzzz"})

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf089_todos_los_roles_leen_listado_y_detalle(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    destino = await _destino(sesion, nombre="Salta", pais="Argentina")
    c = await cliente_como(rol)

    listado = await c.get("/api/destinos")
    detalle = await c.get(_url(destino.id))

    assert listado.status_code == 200
    assert _ids(listado.json()) == [str(destino.id)]
    assert detalle.status_code == 200
    assert detalle.json()["id"] == str(destino.id)


# --- Ver uno -------------------------------------------------------------------------------


async def test_rf089_ver_devuelve_todos_los_campos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Salta", pais="Argentina", region="NOA", notas="Cerros")
    c = await cliente_como("empleado")

    r = await c.get(_url(destino.id))

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(destino.id)
    assert (cuerpo["nombre"], cuerpo["pais"]) == ("Salta", "Argentina")
    assert (cuerpo["region"], cuerpo["notas"]) == ("NOA", "Cerros")
    assert cuerpo["activo"] is True


async def test_rf089_ver_inactivo_tambien_se_puede(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await crear(sesion, DestinoFactory, nombre="Ushuaia", activo=False)
    c = await cliente_como("empleado")

    r = await c.get(_url(destino.id))

    assert r.status_code == 200
    assert r.json()["activo"] is False


async def test_rf089_ver_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(_url(INEXISTENTE))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Nombre duplicado (RF-090, A1) ---------------------------------------------------------


@pytest.mark.parametrize(
    "nombre",
    ["Cancún", "cancún", "CANCUN", "cancun", "  Cancún  ", "CANCÚN"],
)
async def test_rf090_nombre_duplicado_409(
    cliente_como: Fabrica, sesion: AsyncSession, nombre: str
) -> None:
    await _destino(sesion, nombre="Cancún", pais="México")
    c = await cliente_como("admin")

    r = await c.post("/api/destinos", json={"nombre": nombre, "pais": "México"})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 409
    assert await _cantidad(sesion) == 1  # sin alta


async def test_rf090_duplicado_normalizado_con_espacios_internos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await _destino(sesion, nombre="Buenos Aires")
    c = await cliente_como("admin")

    r = await c.post("/api/destinos", json={"nombre": "buenos   AIRES", "pais": "Argentina"})

    assert r.status_code == 409


async def test_rf090_duplicado_contra_un_destino_inactivo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await crear(sesion, DestinoFactory, nombre="Cancún", activo=False)
    c = await cliente_como("admin")

    r = await c.post("/api/destinos", json={"nombre": "cancun", "pais": "México"})

    assert r.status_code == 409
    assert await _cantidad(sesion) == 1


async def test_rf090_nombre_distinto_no_es_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await _destino(sesion, nombre="Cancún")
    c = await cliente_como("admin")

    r = await c.post("/api/destinos", json={"nombre": "Cozumel", "pais": "México"})

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


# --- Edición (RF-090) ----------------------------------------------------------------------


async def test_rf090_editar_parcial_solo_cambia_lo_enviado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Salta", pais="Argentina", region="NOA", notas="Cerros")
    c = await cliente_como("dueno")

    r = await c.patch(_url(destino.id), json={"region": "Norte"})

    assert r.status_code == 200
    assert r.json()["region"] == "Norte"
    assert r.json()["nombre"] == "Salta"
    assert r.json()["notas"] == "Cerros"
    await sesion.refresh(destino)
    assert (destino.nombre, destino.pais, destino.region) == ("Salta", "Argentina", "Norte")
    assert destino.notas == "Cerros"


async def test_rf090_editar_nombre_y_pais(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino = await _destino(sesion, nombre="Salta", pais="Argentina")
    c = await cliente_como("admin")

    r = await c.patch(_url(destino.id), json={"nombre": "Jujuy", "pais": "AR"})

    assert r.status_code == 200
    await sesion.refresh(destino)
    assert (destino.nombre, destino.pais) == ("Jujuy", "AR")


async def test_rf090_editar_puede_vaciar_region_y_notas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Salta", region="NOA", notas="Cerros")
    c = await cliente_como("admin")

    r = await c.patch(_url(destino.id), json={"region": None, "notas": None})

    assert r.status_code == 200
    await sesion.refresh(destino)
    assert destino.region is None
    assert destino.notas is None


async def test_rf090_editar_con_el_mismo_nombre_no_es_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Cancún", pais="México")
    c = await cliente_como("admin")

    r = await c.patch(_url(destino.id), json={"nombre": "CANCUN", "notas": "Caribe"})

    assert r.status_code == 200
    assert r.json()["nombre"] == "CANCUN"
    assert r.json()["notas"] == "Caribe"


async def test_rf090_editar_a_un_nombre_ajeno_da_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await _destino(sesion, nombre="Cancún")
    otro = await _destino(sesion, nombre="Cozumel")
    c = await cliente_como("admin")

    r = await c.patch(_url(otro.id), json={"nombre": "  cancun "})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(otro)
    assert otro.nombre == "Cozumel"


@pytest.mark.parametrize("cuerpo", [{"nombre": ""}, {"nombre": None}, {"pais": None}, {"pais": ""}])
async def test_rf090_editar_invalido_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, str | None]
) -> None:
    destino = await _destino(sesion, nombre="Salta")
    c = await cliente_como("admin")

    r = await c.patch(_url(destino.id), json=cuerpo)

    assert r.status_code == 422
    await sesion.refresh(destino)
    assert destino.nombre == "Salta"


async def test_rf090_editar_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.patch(_url(INEXISTENTE), json={"notas": "x"})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Baja lógica (RF-091, A2) --------------------------------------------------------------


async def test_rf091_baja_logica_en_uso(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino = await _destino(sesion, nombre="Cancún")
    cliente = await crear(sesion, ClienteFactory)
    responsable = await crear(sesion, UsuarioFactory, activo=True)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable.id,
    )
    c = await cliente_como("admin")

    r = await c.post(f"{_url(destino.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False
    await sesion.refresh(destino)
    assert destino.activo is False
    await sesion.refresh(viaje)
    assert viaje.destino_id == destino.id  # el viaje sigue apuntando al destino
    listado = await c.get("/api/destinos")
    assert str(destino.id) not in _ids(listado.json())
    inactivos = await c.get("/api/destinos", params={"activo": "false"})
    assert str(destino.id) in _ids(inactivos.json())


async def test_rf091_baja_sin_uso(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino = await _destino(sesion, nombre="Salta")
    c = await cliente_como("dueno")

    r = await c.post(f"{_url(destino.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False
    assert await _cantidad(sesion) == 1  # lógica: la fila sigue


async def test_rf091_baja_de_uno_ya_inactivo_es_idempotente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await crear(sesion, DestinoFactory, nombre="Salta", activo=False)
    c = await cliente_como("admin")

    r = await c.post(f"{_url(destino.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False


async def test_rf091_baja_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"{_url(INEXISTENTE)}/baja")

    assert r.status_code == 404


# --- Reactivar (RF-092, A3) ----------------------------------------------------------------


async def test_rf092_reactivar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino = await crear(sesion, DestinoFactory, nombre="Salta", activo=False)
    c = await cliente_como("admin")

    r = await c.post(f"{_url(destino.id)}/reactivar")

    assert r.status_code == 200
    assert r.json()["activo"] is True
    await sesion.refresh(destino)
    assert destino.activo is True
    listado = await c.get("/api/destinos")
    assert str(destino.id) in _ids(listado.json())


async def test_rf092_reactivar_uno_ya_activo_es_idempotente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Salta")
    c = await cliente_como("admin")

    r = await c.post(f"{_url(destino.id)}/reactivar")

    assert r.status_code == 200
    assert r.json()["activo"] is True


async def test_rf092_reactivar_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"{_url(INEXISTENTE)}/reactivar")

    assert r.status_code == 404


# --- Auditoría (RF-153) --------------------------------------------------------------------


async def test_rf153_updated_by_queda_con_quien_edito(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Salta")
    c = await cliente_como("dueno")

    r = await c.patch(_url(destino.id), json={"notas": "Cerros"})

    assert r.status_code == 200
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(destino)
    assert destino.updated_by == c.usuario.id  # type: ignore[attr-defined]


async def test_rf153_baja_y_reactivacion_dejan_updated_by(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Salta")
    c = await cliente_como("admin")
    quien = str(c.usuario.id)  # type: ignore[attr-defined]

    baja = await c.post(f"{_url(destino.id)}/baja")
    assert baja.json()["updated_by"] == quien

    destino.updated_by = None
    await sesion.flush()
    reactivado = await c.post(f"{_url(destino.id)}/reactivar")
    assert reactivado.json()["updated_by"] == quien
