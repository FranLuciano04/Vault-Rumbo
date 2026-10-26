"""Fix de la review de M2 (H-02): la API valida el contacto como teléfono o email (CU-02 A3,
CU-03 A2, RF-002, DEC-0017). Misma regla que el esquema zod de shared: teléfono de 7 a 15
dígitos (con `+`, espacios, guiones y paréntesis) o email válido."""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente
from tests.fabricas import ClienteFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
CUERPO = {"nombre": "Ana Pérez", "contacto": "ana@mail.test", "segmento": "pareja"}

CONTACTOS_INVALIDOS = [
    "sin contacto",
    "123",
    "@ana",
    "ana@",
    "1234567890123456",  # 16 dígitos: pasa el tope de 15
    "11 5555 1234 / 11 4444 5678",  # dos números
]
CONTACTOS_VALIDOS = [
    "+54 9 11 5555-1234",
    "(011) 5555-1234",
    "1155551234",
    "ana@mail.test",
    "Ana.Perez+viajes@Mail.Test",
]


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Cliente))).scalar_one()


def _campos_con_error(cuerpo: dict[str, Any]) -> list[str]:
    return [e["campo"] for e in cuerpo["errores"]]


@pytest.mark.parametrize("contacto", CONTACTOS_INVALIDOS)
async def test_rf002_alta_con_contacto_invalido_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, contacto: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "contacto": contacto})

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "contacto" in _campos_con_error(r.json())
    assert await _cantidad(sesion) == 0


@pytest.mark.parametrize("contacto", CONTACTOS_VALIDOS)
async def test_rf002_alta_con_telefono_o_email_validos_201(
    cliente_como: FabricaCliente, sesion: AsyncSession, contacto: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "contacto": contacto})

    assert r.status_code == 201, r.text
    assert r.json()["contacto"] == contacto
    assert await _cantidad(sesion) == 1


@pytest.mark.parametrize("contacto", CONTACTOS_INVALIDOS)
async def test_rf002_edicion_con_contacto_invalido_422_y_conserva_el_anterior(
    cliente_como: FabricaCliente, sesion: AsyncSession, contacto: str
) -> None:
    cliente = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{cliente.id}", json={"contacto": contacto})

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "contacto" in _campos_con_error(r.json())
    await sesion.refresh(cliente)
    assert cliente.contacto == "ana@mail.test"


@pytest.mark.parametrize("contacto", CONTACTOS_VALIDOS)
async def test_rf002_edicion_con_telefono_o_email_validos_200(
    cliente_como: FabricaCliente, sesion: AsyncSession, contacto: str
) -> None:
    cliente = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="viejo@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{cliente.id}", json={"contacto": contacto})

    assert r.status_code == 200, r.text
    assert r.json()["contacto"] == contacto


async def test_rf002_edicion_recorta_y_valida_el_contacto_recortado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    cliente = await crear(sesion, ClienteFactory, contacto="viejo@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{cliente.id}", json={"contacto": "   123   "})

    assert r.status_code == 422, r.text
    await sesion.refresh(cliente)
    assert cliente.contacto == "viejo@mail.test"


# --- Review de seguridad: espacios Unicode, clave recalculada y contactos viejos ---------------

ESPACIOS_UNICODE = [" ", " ", "　", " ", "﻿"]


@pytest.mark.parametrize("espacio", ESPACIOS_UNICODE)
async def test_rf002_espacio_unicode_vale_como_espacio_igual_que_en_el_front(
    cliente_como: FabricaCliente, sesion: AsyncSession, espacio: str
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="11 4567 8901")
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={**CUERPO, "nombre": "Beatriz Soler", "contacto": f"11{espacio}4567{espacio}8901"},
    )

    assert r.status_code == 409, r.text  # es válido (no 422) y es el mismo teléfono


async def test_rf003_editar_el_contacto_recalcula_la_clave_de_duplicados(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    cliente = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    c = await cliente_como("empleado")
    editado = await c.patch(f"/api/clientes/{cliente.id}", json={"contacto": "+54 9 11 5555-1234"})
    assert editado.status_code == 200, editado.text

    r = await c.post(
        "/api/clientes",
        json={"nombre": "Beatriz Soler", "contacto": "5491155551234", "segmento": "pareja"},
    )

    assert r.status_code == 409, r.text
    assert [d["id"] for d in r.json()["duplicados"]] == [str(cliente.id)]


async def test_rf002_un_contacto_viejo_invalido_se_puede_leer_sin_500(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    cliente = await crear(sesion, ClienteFactory, contacto="sin dato")
    c = await cliente_como("empleado")

    ficha = await c.get(f"/api/clientes/{cliente.id}")
    listado = await c.get("/api/clientes")

    assert ficha.status_code == 200, ficha.text
    assert ficha.json()["contacto"] == "sin dato"
    assert listado.status_code == 200, listado.text
