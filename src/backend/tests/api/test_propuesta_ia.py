"""T-131: borradores de contenido con IA (CU-20, RF-119, RF-120, RF-122, RNF-16, DEC-0012).

El modelo es siempre el falso (`IA_MODELO=falso` por defecto); cada test reemplaza su `generar`
para registrar el prompt recibido o para simular una falla. Nunca se llama a la API de Claude.
"""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core import ia
from rumbo.core.errores import ServicioExterno
from rumbo.datos.modelos import Cliente, ContenidoRed, Viaje
from tests.fabricas import ClienteFactory, crear

RUTA = "/api/contenidos/propuestas-ia"
PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
PEDIDO = {
    "tema": "Cataratas del Iguazú en 4 días, salida grupal en noviembre",
    "canal": "instagram",
    "tono": "promocionar un destino",
}
SALIDA = "Borrador de prueba del modelo falso."


async def _con_redes(cliente_como: FabricaCliente) -> AsyncClient:
    c = await cliente_como("empleado")
    c.usuario.acceso_redes = True  # type: ignore[attr-defined]
    return c


@pytest.fixture
def prompts(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Reemplaza `ModeloFalso.generar` y devuelve la lista de prompts que recibió."""
    recibidos: list[str] = []

    async def _generar(self: ia.ModeloFalso, prompt: str) -> str:
        recibidos.append(prompt)
        return SALIDA

    monkeypatch.setattr(ia.ModeloFalso, "generar", _generar)
    return recibidos


async def _contar(sesion: AsyncSession, modelo: type) -> int:
    return (await sesion.execute(select(func.count()).select_from(modelo))).scalar_one()


async def test_rf119_devuelve_borradores(
    cliente_como: FabricaCliente, prompts: list[str]
) -> None:
    c = await _con_redes(cliente_como)

    r = await c.post(RUTA, json=PEDIDO)

    assert r.status_code == 200
    borradores = r.json()["borradores"]
    assert len(borradores) >= 1
    for borrador in borradores:
        assert borrador["texto"] == SALIDA
        assert isinstance(borrador["titulo"], str) and borrador["titulo"].strip()
        assert "id" not in borrador


async def test_rf119_el_prompt_lleva_tema_canal_y_tono(
    cliente_como: FabricaCliente, prompts: list[str]
) -> None:
    c = await _con_redes(cliente_como)

    await c.post(RUTA, json=PEDIDO)

    assert len(prompts) >= 1
    for prompt in prompts:
        assert PEDIDO["tema"] in prompt
        assert "instagram" in prompt
        assert PEDIDO["tono"] in prompt
        assert "Sos redactor de contenido para redes sociales" in prompt


async def test_rf120_sin_datos_de_clientes(
    cliente_como: FabricaCliente, sesion: AsyncSession, prompts: list[str]
) -> None:
    await crear(
        sesion,
        ClienteFactory,
        nombre="Zoraida Quintanilla Ferreyra",
        contacto="+5491155550123",
        instagram="zoraida_quinta",
        preferencias="Viaja con su perro Capitan Bermudez",
    )
    c = await _con_redes(cliente_como)

    r = await c.post(RUTA, json=PEDIDO)

    assert r.status_code == 200
    assert len(prompts) >= 1
    for prompt in prompts:
        for dato in ("Zoraida", "Quintanilla", "5491155550123", "zoraida_quinta", "Bermudez"):
            assert dato not in prompt


async def test_rf120_el_prompt_no_incluye_nada_fuera_del_pedido(
    cliente_como: FabricaCliente, prompts: list[str]
) -> None:
    c = await _con_redes(cliente_como)
    pedido = {"tema": "Escapada a Bariloche", "canal": "whatsapp_ventas", "tono": "oferta"}

    await c.post(RUTA, json=pedido)

    assert len(prompts) >= 1
    for prompt in prompts:
        assert "Escapada a Bariloche" in prompt
        assert "whatsapp_ventas" in prompt
        assert c.usuario.nombre not in prompt  # type: ignore[attr-defined]
        assert c.usuario.email not in prompt  # type: ignore[attr-defined]


async def test_rf122_no_persiste(
    cliente_como: FabricaCliente, sesion: AsyncSession, prompts: list[str]
) -> None:
    c = await _con_redes(cliente_como)
    piezas = await _contar(sesion, ContenidoRed)
    clientes = await _contar(sesion, Cliente)
    viajes = await _contar(sesion, Viaje)

    primera = await c.post(RUTA, json=PEDIDO)
    regenerada = await c.post(RUTA, json={**PEDIDO, "tono": "anunciar una oferta"})

    assert primera.status_code == 200
    assert regenerada.status_code == 200
    assert await _contar(sesion, ContenidoRed) == piezas
    assert await _contar(sesion, Cliente) == clientes
    assert await _contar(sesion, Viaje) == viajes


async def test_rf119_el_tono_es_opcional(
    cliente_como: FabricaCliente, prompts: list[str]
) -> None:
    c = await _con_redes(cliente_como)

    r = await c.post(RUTA, json={"tema": "Verano en Mar del Plata", "canal": "tiktok"})

    assert r.status_code == 200
    assert len(r.json()["borradores"]) >= 1


async def test_error_ia_502(
    cliente_como: FabricaCliente, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def _falla(self: ia.ModeloFalso, prompt: str) -> str:
        raise ServicioExterno("No se pudo generar el texto con el servicio de IA.")

    monkeypatch.setattr(ia.ModeloFalso, "generar", _falla)
    c = await _con_redes(cliente_como)

    r = await c.post(RUTA, json=PEDIDO)

    assert r.status_code == 502
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 502


async def test_error_ia_502_no_persiste(
    cliente_como: FabricaCliente, sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def _falla(self: ia.ModeloFalso, prompt: str) -> str:
        raise ServicioExterno("No se pudo generar el texto con el servicio de IA.")

    monkeypatch.setattr(ia.ModeloFalso, "generar", _falla)
    c = await _con_redes(cliente_como)
    antes = await _contar(sesion, ContenidoRed)

    await c.post(RUTA, json=PEDIDO)

    assert await _contar(sesion, ContenidoRed) == antes
