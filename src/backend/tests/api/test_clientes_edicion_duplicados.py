"""Fix de la review de M2 (H-04, DEC-0020): editar el nombre o el contacto de una ficha avisa de
los duplicados igual que el alta (CU-02 A1, RF-003, CU-03, RF-007): `409` con `duplicados` y, para
guardar igual, se reenvía el PATCH con `confirmar_duplicado: true`. Solo se controla lo que cambia
y el propio cliente nunca cuenta como duplicado."""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.fabricas import ClienteFactory, UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]

# Todos son el mismo celular: +54 9 11 5555-1234.
VARIANTES_DEL_MISMO_TELEFONO = [
    "+54 9 11 5555-1234",
    "5491155551234",
    "011 15-5555-1234",
    "11 5555 1234",
]
VARIANTES_DEL_MISMO_NOMBRE = ["Ana Pérez", "ANA PÉREZ", "ana perez", "  Ana    Pérez  "]


def _ids(cuerpo: dict[str, Any]) -> list[str]:
    return [d["id"] for d in cuerpo["duplicados"]]


# --- 1. contacto que ya tiene otro cliente ---------------------------------------------------


@pytest.mark.parametrize("nuevo", VARIANTES_DEL_MISMO_TELEFONO)
async def test_rf003_editar_contacto_a_uno_ajeno_da_409_y_no_modifica_la_ficha(
    cliente_como: FabricaCliente, sesion: AsyncSession, nuevo: str
) -> None:
    otro = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="+54 9 11 5555-1234")
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": nuevo})

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert _ids(r.json()) == [str(otro.id)]
    await sesion.refresh(propio)
    assert propio.contacto == "bea@mail.test"


async def test_rf003_editar_contacto_a_un_email_con_otras_mayusculas_da_409(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    otro = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="Ana@Mail.Test")
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": "ANA@mail.test"})

    assert r.status_code == 409, r.text
    assert _ids(r.json()) == [str(otro.id)]


async def test_rf003_editar_a_un_contacto_libre_da_200(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="+54 9 11 5555-1234")
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": "11 5555 1235"})

    assert r.status_code == 200, r.text


# --- 2. nombre que ya tiene otro cliente -----------------------------------------------------


@pytest.mark.parametrize("nuevo", VARIANTES_DEL_MISMO_NOMBRE)
async def test_rf003_editar_nombre_a_uno_ajeno_da_409_y_no_modifica_la_ficha(
    cliente_como: FabricaCliente, sesion: AsyncSession, nuevo: str
) -> None:
    otro = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"nombre": nuevo})

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert _ids(r.json()) == [str(otro.id)]
    await sesion.refresh(propio)
    assert propio.nombre == "Beatriz Soler"


async def test_rf003_editar_nombre_y_contacto_juntos_lista_cada_duplicado_una_vez(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    mismo_nombre = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    mismo_contacto = await crear(
        sesion, ClienteFactory, nombre="Carla Díaz", contacto="carla@mail.test"
    )
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{propio.id}", json={"nombre": "ana pérez", "contacto": "CARLA@mail.test"}
    )

    assert r.status_code == 409, r.text
    assert sorted(_ids(r.json())) == sorted([str(mismo_nombre.id), str(mismo_contacto.id)])


# --- 3. el propio cliente no cuenta ----------------------------------------------------------


@pytest.mark.parametrize("nuevo", VARIANTES_DEL_MISMO_NOMBRE)
async def test_rf003_reenviar_el_mismo_nombre_escrito_distinto_no_es_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession, nuevo: str
) -> None:
    propio = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"nombre": nuevo})

    assert r.status_code == 200, r.text


@pytest.mark.parametrize("nuevo", VARIANTES_DEL_MISMO_TELEFONO)
async def test_rf003_reenviar_el_mismo_telefono_en_otro_formato_no_es_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession, nuevo: str
) -> None:
    propio = await crear(
        sesion, ClienteFactory, nombre="Ana Pérez", contacto="+54 9 11 5555-1234"
    )
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": nuevo})

    assert r.status_code == 200, r.text


async def test_rf003_reenviar_el_mismo_email_con_otras_mayusculas_no_es_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    propio = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": "ANA@Mail.Test"})

    assert r.status_code == 200, r.text


# --- 4. solo se controla lo que cambia -------------------------------------------------------


async def test_rf003_cambiar_solo_el_contacto_no_avisa_por_un_nombre_repetido(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    propio = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="otra@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": "nueva@mail.test"})

    assert r.status_code == 200, r.text
    assert r.json()["contacto"] == "nueva@mail.test"


async def test_rf003_cambiar_solo_el_nombre_no_avisa_por_un_contacto_repetido(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="compartido@mail.test")
    propio = await crear(
        sesion, ClienteFactory, nombre="Beatriz Soler", contacto="compartido@mail.test"
    )
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{propio.id}", json={"nombre": "Beatriz S. de Gómez"})

    assert r.status_code == 200, r.text
    assert r.json()["nombre"] == "Beatriz S. de Gómez"


async def test_rf007_un_duplicado_ya_confirmado_edita_el_resto_de_la_ficha_sin_409_dec_0020(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="compartido@mail.test")
    propio = await crear(
        sesion, ClienteFactory, nombre="Ana Pérez", contacto="compartido@mail.test"
    )
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{propio.id}",
        json={
            "segmento": "pareja",
            "etiquetas": ["playa"],
            "preferencias": "all inclusive",
            "instagram": "ana.perez",
            "no_recontactar": True,
        },
    )

    assert r.status_code == 200, r.text
    assert r.json()["segmento"] == "pareja"
    assert r.json()["etiquetas"] == ["playa"]


async def test_rf007_un_duplicado_ya_confirmado_puede_reenviar_sus_mismos_nombre_y_contacto(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="compartido@mail.test")
    propio = await crear(
        sesion, ClienteFactory, nombre="Ana Pérez", contacto="compartido@mail.test"
    )
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{propio.id}",
        json={"nombre": "Ana Pérez", "contacto": "compartido@mail.test", "segmento": "pareja"},
    )

    assert r.status_code == 200, r.text


# --- 5. confirmar_duplicado ------------------------------------------------------------------


async def test_rf003_confirmar_duplicado_guarda_el_contacto_repetido_y_no_lo_persiste_ni_lo_devuelve(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{propio.id}",
        json={"contacto": "ana@mail.test", "confirmar_duplicado": True},
    )

    assert r.status_code == 200, r.text
    assert r.json()["contacto"] == "ana@mail.test"
    assert "confirmar_duplicado" not in r.json()
    await sesion.refresh(propio)
    assert propio.contacto == "ana@mail.test"
    assert not hasattr(propio, "confirmar_duplicado")


async def test_rf003_confirmar_duplicado_guarda_el_nombre_repetido(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{propio.id}", json={"nombre": "Ana Pérez", "confirmar_duplicado": True}
    )

    assert r.status_code == 200, r.text
    assert r.json()["nombre"] == "Ana Pérez"


async def test_rf003_confirmar_duplicado_sin_duplicados_tampoco_aparece_en_la_respuesta(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    propio = await crear(sesion, ClienteFactory, nombre="Beatriz Soler", contacto="bea@mail.test")
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{propio.id}",
        json={"nombre": "Beatriz S.", "confirmar_duplicado": True},
    )

    assert r.status_code == 200, r.text
    assert "confirmar_duplicado" not in r.json()


# --- 6. freelance: sin datos ajenos (RF-151) -------------------------------------------------


async def test_rf151_freelance_editar_a_un_contacto_ajeno_da_409_sin_datos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="+54 9 11 5555-1234",
        asesor_asignado_id=ajeno.id,
    )
    propio = await crear(
        sesion,
        ClienteFactory,
        nombre="Beatriz Soler",
        contacto="bea@mail.test",
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": "5491155551234"})

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["duplicados"] == []
    assert "Ana Pérez" not in r.text
    await sesion.refresh(propio)
    assert propio.contacto == "bea@mail.test"


async def test_rf151_freelance_editar_a_un_nombre_ajeno_no_avisa(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        asesor_asignado_id=ajeno.id,
    )
    propio = await crear(
        sesion,
        ClienteFactory,
        nombre="Beatriz Soler",
        contacto="bea@mail.test",
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r = await c.patch(f"/api/clientes/{propio.id}", json={"nombre": "Ana Pérez"})

    assert r.status_code == 200, r.text


async def test_rf151_freelance_confirma_el_contacto_ajeno_y_se_guarda(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        asesor_asignado_id=ajeno.id,
    )
    propio = await crear(
        sesion,
        ClienteFactory,
        nombre="Beatriz Soler",
        contacto="bea@mail.test",
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r = await c.patch(
        f"/api/clientes/{propio.id}",
        json={"contacto": "ana@mail.test", "confirmar_duplicado": True},
    )

    assert r.status_code == 200, r.text
    assert r.json()["contacto"] == "ana@mail.test"
    assert "confirmar_duplicado" not in r.json()


async def test_rf151_freelance_con_un_duplicado_propio_ve_su_ficha_en_el_409(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    mio = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )
    propio = await crear(
        sesion,
        ClienteFactory,
        nombre="Beatriz Soler",
        contacto="bea@mail.test",
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r = await c.patch(f"/api/clientes/{propio.id}", json={"contacto": "ana@mail.test"})

    assert r.status_code == 409, r.text
    assert _ids(r.json()) == [str(mio.id)]
