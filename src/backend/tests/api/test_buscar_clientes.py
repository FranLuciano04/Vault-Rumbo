"""T-041: buscar clientes según la visibilidad del rol (CU-03; RF-005, RF-009, RF-031, RF-151).

Contrato asumido: `GET /api/clientes` acepta `buscar`, `segmento`, `etiquetas` (parámetro repetido,
el cliente debe tener TODAS), `mios`, `pagina` y `por_pagina`; responde `{items, total, pagina,
por_pagina}` ordenado por nombre ascendente. `GET /api/clientes/{id}` devuelve la ficha.
"""

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import SegmentoCliente
from tests.fabricas import ClienteFactory, UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
ROLES_AGENCIA = ["admin", "dueno", "empleado"]
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


def _ids(r: Response) -> list[str]:
    assert r.status_code == 200, r.text
    return [i["id"] for i in r.json()["items"]]


def _yo(c: AsyncClient) -> Any:
    return c.usuario.id  # type: ignore[attr-defined]


# --- RF-005: búsqueda por texto -------------------------------------------------------------


async def test_rf005_buscar_por_texto_en_el_nombre(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ana = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="+5491100000001")
    await crear(sesion, ClienteFactory, nombre="Carlos Gómez", contacto="+5491100000002")
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"buscar": "Ana"})

    assert _ids(r) == [str(ana.id)]
    assert r.json()["total"] == 1


async def test_rf005_buscar_por_texto_en_el_contacto(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ana = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    await crear(sesion, ClienteFactory, nombre="Carlos Gómez", contacto="+5491100000002")
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"buscar": "mail.test"})

    assert _ids(r) == [str(ana.id)]


@pytest.mark.parametrize("texto", ["jose perez", "JOSE PEREZ", "josé pérez", "José", "perez"])
async def test_rf005_buscar_sin_tildes_ni_mayusculas(
    cliente_como: FabricaCliente, sesion: AsyncSession, texto: str
) -> None:
    jose = await crear(sesion, ClienteFactory, nombre="José Pérez")
    await crear(sesion, ClienteFactory, nombre="Marta Díaz")
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"buscar": texto})

    assert _ids(r) == [str(jose.id)]


async def test_rf005_buscar_sin_coincidencias_devuelve_lista_vacia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez")
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"buscar": "zzzz"})

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


async def test_rf005_sin_filtros_lista_toda_la_agencia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    uno = await crear(sesion, ClienteFactory, nombre="Ana")
    dos = await crear(sesion, ClienteFactory, nombre="Beto")
    c = await cliente_como("dueno")

    r = await c.get("/api/clientes")

    assert sorted(_ids(r)) == sorted([str(uno.id), str(dos.id)])
    assert r.json()["pagina"] == 1


# --- RF-031: etiquetas y segmento -----------------------------------------------------------


async def test_rf031_filtrar_por_una_etiqueta(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    brasil = await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil", "Playa"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["Familias"])
    await crear(sesion, ClienteFactory, nombre="Carla", etiquetas=[])
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"etiquetas": "Brasil"})

    assert _ids(r) == [str(brasil.id)]


async def test_rf031_varias_etiquetas_exigen_todas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ambas = await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil", "Familias"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["Brasil"])
    await crear(sesion, ClienteFactory, nombre="Carla", etiquetas=["Familias", "Playa"])
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes?etiquetas=Brasil&etiquetas=Familias")

    assert _ids(r) == [str(ambas.id)]
    assert r.json()["total"] == 1


async def test_rf031_etiquetas_sin_ningun_cliente_que_tenga_todas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["Familias"])
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes?etiquetas=Brasil&etiquetas=Familias")

    assert r.status_code == 200
    assert r.json()["items"] == []


async def test_rf031_etiquetas_se_combinan_con_texto(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ana = await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil", "Familias"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["Brasil", "Familias"])
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes?etiquetas=Brasil&etiquetas=Familias&buscar=ana")

    assert _ids(r) == [str(ana.id)]


async def test_rf031_filtrar_por_segmento(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    pareja = await crear(sesion, ClienteFactory, nombre="Ana", segmento=SegmentoCliente("pareja"))
    await crear(sesion, ClienteFactory, nombre="Beto", segmento=SegmentoCliente("familia"))
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"segmento": "pareja"})

    assert _ids(r) == [str(pareja.id)]


async def test_rf031_segmento_invalido_422(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"segmento": "otro"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- RF-009: vista personal -----------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES_AGENCIA)
async def test_rf009_vista_personal_trae_solo_los_suyos(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    mio = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=_yo(c))
    await crear(sesion, ClienteFactory, nombre="Beto", asesor_asignado_id=otro.id)
    await crear(sesion, ClienteFactory, nombre="Carla", asesor_asignado_id=None)

    r = await c.get("/api/clientes", params={"mios": "true"})

    assert _ids(r) == [str(mio.id)]
    assert r.json()["total"] == 1


@pytest.mark.parametrize("rol", ROLES_AGENCIA)
async def test_rf009_sin_mios_ve_toda_la_agencia(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    mio = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=_yo(c))
    ajeno = await crear(sesion, ClienteFactory, nombre="Beto", asesor_asignado_id=otro.id)
    libre = await crear(sesion, ClienteFactory, nombre="Carla", asesor_asignado_id=None)

    r = await c.get("/api/clientes")

    assert sorted(_ids(r)) == sorted([str(mio.id), str(ajeno.id), str(libre.id)])


async def test_rf009_mios_se_combina_con_etiquetas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    mio = await crear(
        sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil"], asesor_asignado_id=_yo(c)
    )
    await crear(
        sesion, ClienteFactory, nombre="Beto", etiquetas=["Brasil"], asesor_asignado_id=otro.id
    )
    await crear(
        sesion, ClienteFactory, nombre="Carla", etiquetas=["Playa"], asesor_asignado_id=_yo(c)
    )

    r = await c.get("/api/clientes?mios=true&etiquetas=Brasil")

    assert _ids(r) == [str(mio.id)]


# --- RF-151: el freelance ve solo los suyos -------------------------------------------------


@pytest.mark.parametrize("mios", [None, "false", "true"])
async def test_rf151_freelance_listado_solo_ve_los_suyos(
    cliente_como: FabricaCliente, sesion: AsyncSession, mios: str | None
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    mio = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=_yo(c))
    await crear(sesion, ClienteFactory, nombre="Beto", asesor_asignado_id=otro.id)
    await crear(sesion, ClienteFactory, nombre="Carla", asesor_asignado_id=None)
    params = {} if mios is None else {"mios": mios}

    r = await c.get("/api/clientes", params=params)

    assert _ids(r) == [str(mio.id)]
    assert r.json()["total"] == 1


async def test_rf151_freelance_la_busqueda_no_revela_clientes_ajenos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Ajena",
        etiquetas=["Brasil"],
        asesor_asignado_id=otro.id,
    )
    propio = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Propia",
        etiquetas=["Brasil"],
        asesor_asignado_id=_yo(c),
    )

    r = await c.get("/api/clientes?buscar=ana&etiquetas=Brasil&mios=false")

    assert _ids(r) == [str(propio.id)]
    assert r.json()["total"] == 1


async def test_rf151_freelance_detalle_ajeno_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    ajeno = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)

    r = await c.get(f"/api/clientes/{ajeno.id}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 404


async def test_rf151_freelance_detalle_de_cliente_sin_asesor_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    libre = await crear(sesion, ClienteFactory, asesor_asignado_id=None)

    r = await c.get(f"/api/clientes/{libre.id}")

    assert r.status_code == 404


async def test_rf151_ajeno_e_inexistente_son_indistinguibles(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    ajeno = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)

    r_ajeno = await c.get(f"/api/clientes/{ajeno.id}")
    r_inexistente = await c.get(f"/api/clientes/{uuid.uuid4()}")

    assert r_ajeno.status_code == r_inexistente.status_code == 404
    assert r_ajeno.json()["title"] == r_inexistente.json()["title"]


async def test_rf151_freelance_detalle_propio_200(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    mio = await crear(sesion, ClienteFactory, asesor_asignado_id=_yo(c))

    r = await c.get(f"/api/clientes/{mio.id}")

    assert r.status_code == 200
    assert r.json()["id"] == str(mio.id)


# --- CU-03: ficha ---------------------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf005_detalle_propio_devuelve_todos_los_campos(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    mio = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        instagram="viajes.ana",
        segmento=SegmentoCliente("pareja"),
        etiquetas=["Brasil", "Familias"],
        preferencias="Prefiere all inclusive",
        asesor_asignado_id=_yo(c),
    )

    r = await c.get(f"/api/clientes/{mio.id}")

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(mio.id)
    assert cuerpo["nombre"] == "Ana Pérez"
    assert cuerpo["contacto"] == "ana@mail.test"
    assert cuerpo["instagram"] == "viajes.ana"
    assert cuerpo["segmento"] == "pareja"
    assert cuerpo["etiquetas"] == ["Brasil", "Familias"]
    assert cuerpo["preferencias"] == "Prefiere all inclusive"
    assert cuerpo["no_recontactar"] is False
    assert cuerpo["asesor_asignado_id"] == str(_yo(c))
    assert "created_at" in cuerpo


@pytest.mark.parametrize("rol", ROLES_AGENCIA)
async def test_rf009_detalle_de_cliente_ajeno_visible_para_la_agencia(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    ajeno = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)

    r = await c.get(f"/api/clientes/{ajeno.id}")

    assert r.status_code == 200
    assert r.json()["id"] == str(ajeno.id)


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf005_detalle_inexistente_404(cliente_como: FabricaCliente, rol: str) -> None:
    c = await cliente_como(rol)

    r = await c.get(f"/api/clientes/{uuid.uuid4()}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf005_detalle_con_id_mal_formado_422(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes/no-es-un-uuid")

    assert r.status_code == 422


# --- Paginación y orden ---------------------------------------------------------------------


async def test_rf005_paginacion_y_orden_por_nombre(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    creados = {}
    for nombre in ["Delia", "Ana", "Carla", "Beto", "Eva"]:
        creados[nombre] = await crear(sesion, ClienteFactory, nombre=nombre)
    c = await cliente_como("empleado")

    p1 = await c.get("/api/clientes", params={"pagina": 1, "por_pagina": 2})
    p2 = await c.get("/api/clientes", params={"pagina": 2, "por_pagina": 2})
    p3 = await c.get("/api/clientes", params={"pagina": 3, "por_pagina": 2})

    assert _ids(p1) == [str(creados["Ana"].id), str(creados["Beto"].id)]
    assert _ids(p2) == [str(creados["Carla"].id), str(creados["Delia"].id)]
    assert _ids(p3) == [str(creados["Eva"].id)]
    for r in (p1, p2, p3):
        assert r.json()["total"] == 5
        assert r.json()["por_pagina"] == 2
    assert p2.json()["pagina"] == 2


async def test_rf005_pagina_fuera_de_rango_devuelve_items_vacios_con_total(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana")
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"pagina": 5, "por_pagina": 10})

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 1


@pytest.mark.parametrize("params", [{"pagina": 0}, {"por_pagina": 0}, {"por_pagina": 101}])
async def test_rf005_paginacion_invalida_422(
    cliente_como: FabricaCliente, params: dict[str, int]
) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params=params)

    assert r.status_code == 422
