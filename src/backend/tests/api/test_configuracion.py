"""T-029: parámetros del negocio (CU-06, DEC-0013): vigencia de la cotización (RF-022),
anticipación de la alerta de salida (RF-035) y meses para el recontacto (RF-027).

El 403 por rol y la forma del contrato ya los cubre `test_contrato_m1.py`.
"""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Configuracion

PROBLEM_JSON = "application/problem+json"
Fabrica = Callable[[str], Awaitable[AsyncClient]]
URL = "/api/configuracion"


async def _fila(sesion: AsyncSession) -> Configuracion:
    fila = await sesion.get(Configuracion, 1)
    assert fila is not None
    await sesion.refresh(fila)
    return fila


async def _fijar(sesion: AsyncSession, vigencia: int, anticipacion: int, recontacto: int) -> None:
    fila = await _fila(sesion)
    fila.vigencia_cotizacion_meses = vigencia
    fila.anticipacion_salida_dias = anticipacion
    fila.recontacto_meses = recontacto
    await sesion.flush()


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf022_lee_los_parametros_con_sus_defaults(cliente_como: Fabrica, rol: str) -> None:
    c = await cliente_como(rol)

    r = await c.get(URL)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["vigencia_cotizacion_meses"] == 1
    assert cuerpo["anticipacion_salida_dias"] == 7
    assert cuerpo["recontacto_meses"] == 6


async def test_rf022_lee_los_valores_vigentes(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    await _fijar(sesion, 3, 15, 12)

    r = await c.get(URL)

    assert r.status_code == 200
    assert r.json()["vigencia_cotizacion_meses"] == 3
    assert r.json()["anticipacion_salida_dias"] == 15
    assert r.json()["recontacto_meses"] == 12


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf022_edita_y_devuelve_los_parametros(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    nuevos = {
        "vigencia_cotizacion_meses": 2,
        "anticipacion_salida_dias": 10,
        "recontacto_meses": 9,
    }

    r = await c.put(URL, json=nuevos)

    assert r.status_code == 200
    for campo, valor in nuevos.items():
        assert r.json()[campo] == valor
    fila = await _fila(sesion)
    assert fila.vigencia_cotizacion_meses == 2
    assert fila.anticipacion_salida_dias == 10
    assert fila.recontacto_meses == 9


async def test_rf022_la_lectura_posterior_ve_lo_editado(cliente_como: Fabrica) -> None:
    c = await cliente_como("dueno")

    await c.put(
        URL,
        json={
            "vigencia_cotizacion_meses": 4,
            "anticipacion_salida_dias": 3,
            "recontacto_meses": 2,
        },
    )
    r = await c.get(URL)

    assert r.status_code == 200
    assert r.json()["vigencia_cotizacion_meses"] == 4
    assert r.json()["anticipacion_salida_dias"] == 3
    assert r.json()["recontacto_meses"] == 2


async def test_rf035_anticipacion_acepta_el_borde_cero(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")

    r = await c.put(
        URL,
        json={
            "vigencia_cotizacion_meses": 1,
            "anticipacion_salida_dias": 0,
            "recontacto_meses": 1,
        },
    )

    assert r.status_code == 200
    assert r.json()["anticipacion_salida_dias"] == 0
    assert (await _fila(sesion)).anticipacion_salida_dias == 0


async def test_rf152_updated_by_queda_con_quien_hizo_el_cambio(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")

    r = await c.put(
        URL,
        json={
            "vigencia_cotizacion_meses": 2,
            "anticipacion_salida_dias": 5,
            "recontacto_meses": 3,
        },
    )

    assert r.status_code == 200
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert (await _fila(sesion)).updated_by == c.usuario.id  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    "cuerpo",
    [
        pytest.param(  # RF-022
            {"vigencia_cotizacion_meses": 0, "anticipacion_salida_dias": 5, "recontacto_meses": 3},
            id="rf022-vigencia-menor-a-1",
        ),
        pytest.param(  # RF-035
            {"vigencia_cotizacion_meses": 2, "anticipacion_salida_dias": -1, "recontacto_meses": 3},
            id="rf035-anticipacion-negativa",
        ),
        pytest.param(  # RF-027
            {"vigencia_cotizacion_meses": 2, "anticipacion_salida_dias": 5, "recontacto_meses": 0},
            id="rf027-recontacto-menor-a-1",
        ),
    ],
)
async def test_rf022_valor_fuera_de_rango_422_y_no_cambia_lo_previo(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")
    await _fijar(sesion, 3, 15, 12)

    r = await c.put(URL, json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    fila = await _fila(sesion)
    assert (
        fila.vigencia_cotizacion_meses,
        fila.anticipacion_salida_dias,
        fila.recontacto_meses,
    ) == (3, 15, 12)


@pytest.mark.parametrize(
    "campo", ["vigencia_cotizacion_meses", "anticipacion_salida_dias", "recontacto_meses"]
)
async def test_rf022_falta_un_campo_422(cliente_como: Fabrica, campo: str) -> None:
    c = await cliente_como("admin")
    cuerpo = {
        "vigencia_cotizacion_meses": 2,
        "anticipacion_salida_dias": 5,
        "recontacto_meses": 3,
    }
    del cuerpo[campo]

    r = await c.put(URL, json=cuerpo)

    assert r.status_code == 422
