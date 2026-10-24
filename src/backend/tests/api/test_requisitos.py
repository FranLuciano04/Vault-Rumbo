"""T-032: requisitos de cada destino (CU-15, RF-086, RF-087, RF-088, RF-034).

El 401/403 por rol de las rutas ya lo cubre `test_contrato_m1.py`. Acá se fija el comportamiento.
Supuestos (no están en el ticket): el listado trae solo requisitos activos (la ruta no tiene filtro
`activo`) y va ordenado por nombre; el destino de las rutas puede estar inactivo; un 404 aplica
a destino o requisito inexistente; `anticipacion_dias` 0 es válido.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Alerta, RequisitoDestino, TipoAlerta
from tests.fabricas import (
    AlertaFactory,
    ClienteFactory,
    DestinoFactory,
    RequisitoDestinoFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
Fabrica = Callable[[str], Awaitable[AsyncClient]]
INEXISTENTE = "00000000-0000-4000-8000-000000000000"
CUERPO = {
    "nombre": "Visa EE.UU.",
    "tipo": "visa",
    "obligatorio": True,
    "descripcion": "Turista B1/B2",
    "anticipacion_dias": 60,
}


def _lista(destino_id: uuid.UUID | str) -> str:
    return f"/api/destinos/{destino_id}/requisitos"


def _url(requisito_id: uuid.UUID | str) -> str:
    return f"/api/requisitos-destino/{requisito_id}"


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(RequisitoDestino))).scalar_one()


async def _destino(sesion: AsyncSession, **campos: Any) -> Any:
    return await crear(sesion, DestinoFactory, activo=True, **campos)


async def _requisito(
    sesion: AsyncSession, destino_id: uuid.UUID, **campos: Any
) -> RequisitoDestino:
    campos.setdefault("activo", True)
    return await crear(sesion, RequisitoDestinoFactory, destino_id=destino_id, **campos)


def _ids(cuerpo: dict[str, Any]) -> list[str]:
    return [r["id"] for r in cuerpo["items"]]


# --- Agregar (RF-086) ----------------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf086_agregar_requisito(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como(rol)

    r = await c.post(_lista(destino.id), json=CUERPO)

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["destino_id"] == str(destino.id)
    assert cuerpo["nombre"] == "Visa EE.UU."
    assert cuerpo["tipo"] == "visa"
    assert cuerpo["obligatorio"] is True
    assert cuerpo["descripcion"] == "Turista B1/B2"
    assert cuerpo["anticipacion_dias"] == 60
    assert cuerpo["activo"] is True
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = await sesion.get(RequisitoDestino, uuid.UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.destino_id == destino.id
    assert fila.anticipacion_dias == 60
    assert fila.activo is True


async def test_rf086_agregar_sin_descripcion_y_con_anticipacion_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como("admin")
    cuerpo = {"nombre": "Pasaporte", "tipo": "documentacion", "obligatorio": False,
              "anticipacion_dias": 0}  # fmt: skip

    r = await c.post(_lista(destino.id), json=cuerpo)

    assert r.status_code == 201
    assert r.json()["descripcion"] is None
    assert r.json()["obligatorio"] is False
    assert r.json()["anticipacion_dias"] == 0


@pytest.mark.parametrize(
    "tipo", ["visa", "vacunacion", "documentacion", "seguro", "formulario", "otro"]
)
async def test_rf086_acepta_todos_los_tipos(
    cliente_como: Fabrica, sesion: AsyncSession, tipo: str
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como("admin")

    r = await c.post(_lista(destino.id), json={**CUERPO, "tipo": tipo})

    assert r.status_code == 201
    assert r.json()["tipo"] == tipo


@pytest.mark.parametrize(
    "cambio",
    [
        {"nombre": ""},
        {"nombre": "x" * 121},
        {"tipo": "inventado"},
        {"obligatorio": "quizas"},
        {"anticipacion_dias": -1},
        {"anticipacion_dias": "mucho"},
    ],
)
async def test_rf086_agregar_invalido_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, cambio: dict[str, Any]
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como("admin")

    r = await c.post(_lista(destino.id), json={**CUERPO, **cambio})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


@pytest.mark.parametrize("faltante", ["nombre", "tipo", "obligatorio", "anticipacion_dias"])
async def test_rf086_agregar_sin_campo_obligatorio_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, faltante: str
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como("admin")
    cuerpo = {k: v for k, v in CUERPO.items() if k != faltante}

    r = await c.post(_lista(destino.id), json=cuerpo)

    assert r.status_code == 422
    assert await _cantidad(sesion) == 0


async def test_rf086_agregar_a_destino_inexistente_da_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")

    r = await c.post(_lista(INEXISTENTE), json=CUERPO)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


# --- Listar (RF-086) -----------------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf086_todos_los_roles_listan_los_requisitos_del_destino(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    otro = await _destino(sesion, nombre="Cancún")
    propio = await _requisito(sesion, destino.id)
    await _requisito(sesion, otro.id, nombre="Vacuna fiebre amarilla")
    c = await cliente_como(rol)

    r = await c.get(_lista(destino.id))

    assert r.status_code == 200
    cuerpo = r.json()
    assert _ids(cuerpo) == [str(propio.id)]
    assert cuerpo["total"] == 1
    assert cuerpo["pagina"] == 1
    assert "por_pagina" in cuerpo
    assert cuerpo["items"][0]["anticipacion_dias"] == 30


async def test_rf086_listado_ordenado_por_nombre_y_pagina(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    for nombre in ("Seguro", "Visa", "Pasaporte"):
        await _requisito(sesion, destino.id, nombre=nombre)
    c = await cliente_como("admin")

    completo = await c.get(_lista(destino.id))
    segunda = await c.get(_lista(destino.id), params={"pagina": 2, "por_pagina": 2})

    assert [i["nombre"] for i in completo.json()["items"]] == ["Pasaporte", "Seguro", "Visa"]
    assert segunda.json()["total"] == 3
    assert [i["nombre"] for i in segunda.json()["items"]] == ["Visa"]


async def test_rf086_listado_de_destino_sin_requisitos_esta_vacio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como("empleado")

    r = await c.get(_lista(destino.id))

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


async def test_rf086_listar_destino_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(_lista(INEXISTENTE))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Editar (RF-087) -----------------------------------------------------------------------


async def test_rf087_editar_parcial_solo_cambia_lo_enviado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id, descripcion="Turista", anticipacion_dias=30)
    c = await cliente_como("dueno")

    r = await c.patch(_url(req.id), json={"anticipacion_dias": 90})

    assert r.status_code == 200
    assert r.json()["anticipacion_dias"] == 90
    assert r.json()["nombre"] == "Visa EE.UU."
    assert r.json()["descripcion"] == "Turista"
    await sesion.refresh(req)
    assert req.anticipacion_dias == 90
    assert req.nombre == "Visa EE.UU."
    assert req.destino_id == destino.id


async def test_rf087_editar_todos_los_campos(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id)
    c = await cliente_como("admin")

    r = await c.patch(
        _url(req.id),
        json={
            "nombre": "Vacuna",
            "tipo": "vacunacion",
            "obligatorio": False,
            "descripcion": "Fiebre amarilla",
            "anticipacion_dias": 15,
        },
    )

    assert r.status_code == 200
    await sesion.refresh(req)
    assert (req.nombre, req.tipo.value, req.obligatorio) == ("Vacuna", "vacunacion", False)
    assert (req.descripcion, req.anticipacion_dias) == ("Fiebre amarilla", 15)


async def test_rf087_editar_puede_vaciar_la_descripcion(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id, descripcion="Turista")
    c = await cliente_como("admin")

    r = await c.patch(_url(req.id), json={"descripcion": None})

    assert r.status_code == 200
    await sesion.refresh(req)
    assert req.descripcion is None


async def test_rf087_editar_no_toca_alertas_emitidas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id, nombre="Visa EE.UU.", anticipacion_dias=30)
    cliente = await crear(sesion, ClienteFactory)
    responsable = await crear(sesion, UsuarioFactory, activo=True)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable.id,
    )
    alerta = await crear(
        sesion,
        AlertaFactory,
        propietario_id=responsable.id,
        viaje_id=viaje.id,
        tipo=TipoAlerta.viaje,
        descripcion="Tramitar Visa EE.UU. (30 días antes)",
        fecha=date(2026, 11, 1),
    )
    c = await cliente_como("admin")

    r = await c.patch(_url(req.id), json={"nombre": "Visa Estados Unidos", "anticipacion_dias": 90})

    assert r.status_code == 200
    assert r.json()["anticipacion_dias"] == 90
    await sesion.refresh(alerta)
    assert alerta.descripcion == "Tramitar Visa EE.UU. (30 días antes)"
    assert alerta.fecha == date(2026, 11, 1)
    assert alerta.viaje_id == viaje.id
    assert (await sesion.execute(select(func.count()).select_from(Alerta))).scalar_one() == 1


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"nombre": ""},
        {"nombre": None},
        {"nombre": "x" * 121},
        {"tipo": "inventado"},
        {"tipo": None},
        {"obligatorio": None},
        {"anticipacion_dias": -5},
        {"anticipacion_dias": None},
    ],
)
async def test_rf087_editar_invalido_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id)
    c = await cliente_como("admin")

    r = await c.patch(_url(req.id), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(req)
    assert req.nombre == "Visa EE.UU."
    assert req.anticipacion_dias == 30


async def test_rf087_editar_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.patch(_url(INEXISTENTE), json={"anticipacion_dias": 10})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf087_editar_requisito_de_baja_da_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id, activo=False, anticipacion_dias=30)
    c = await cliente_como("admin")

    r = await c.patch(_url(req.id), json={"anticipacion_dias": 90})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(req)
    assert req.anticipacion_dias == 30


# --- Baja lógica (RF-088) ------------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf088_baja_logica(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id)
    otro = await _requisito(sesion, destino.id, nombre="Seguro médico")
    c = await cliente_como(rol)

    r = await c.post(f"{_url(req.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert await _cantidad(sesion) == 2  # lógica: la fila sigue
    await sesion.refresh(req)
    assert req.activo is False
    listado = await c.get(_lista(destino.id))
    assert _ids(listado.json()) == [str(otro.id)]


async def test_rf088_baja_no_modifica_alertas_emitidas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id)
    responsable = await crear(sesion, UsuarioFactory, activo=True)
    alerta = await crear(
        sesion,
        AlertaFactory,
        propietario_id=responsable.id,
        descripcion="Tramitar Visa EE.UU.",
        fecha=date(2026, 11, 1),
    )
    c = await cliente_como("admin")

    r = await c.post(f"{_url(req.id)}/baja")

    assert r.status_code == 200
    await sesion.refresh(alerta)
    assert alerta.descripcion == "Tramitar Visa EE.UU."
    assert alerta.fecha == date(2026, 11, 1)


async def test_rf088_baja_de_uno_ya_inactivo_es_idempotente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id, activo=False)
    c = await cliente_como("admin")

    r = await c.post(f"{_url(req.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False


async def test_rf088_baja_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"{_url(INEXISTENTE)}/baja")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Auditoría (RF-034, RF-153) ------------------------------------------------------------


async def test_rf034_editar_deja_updated_by(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id)
    c = await cliente_como("dueno")

    r = await c.patch(_url(req.id), json={"obligatorio": False})

    assert r.status_code == 200
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(req)
    assert req.updated_by == c.usuario.id  # type: ignore[attr-defined]


FUERA_DE_RANGO = 10_000_000_000  # no entra en un INTEGER de Postgres (T-151)


async def test_rf086_anticipacion_fuera_de_rango_da_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    c = await cliente_como("admin")

    r = await c.post(_lista(destino.id), json={**CUERPO, "anticipacion_dias": FUERA_DE_RANGO})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 422
    assert await _cantidad(sesion) == 0


async def test_rf087_editar_anticipacion_fuera_de_rango_da_422(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    destino = await _destino(sesion, nombre="Miami")
    req = await _requisito(sesion, destino.id)
    c = await cliente_como("admin")

    r = await c.patch(_url(req.id), json={"anticipacion_dias": FUERA_DE_RANGO})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 422
    await sesion.refresh(req)
    assert req.anticipacion_dias == 30
