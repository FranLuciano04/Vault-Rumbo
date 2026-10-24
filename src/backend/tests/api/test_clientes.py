"""T-040: alta de clientes con detección de duplicados (CU-02, RF-001, RF-002, RF-003, RF-150)."""

from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente, SegmentoCliente
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    HotelFactory,
    OportunidadFactory,
    ResenaFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
ROLES = ["admin", "dueno", "empleado", "freelance"]
CUERPO = {"nombre": "Ana Pérez", "contacto": "ana@mail.test", "segmento": "pareja"}
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Cliente))).scalar_one()


@pytest.mark.parametrize("rol", ROLES)
async def test_rf001_registrar_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.post("/api/clientes", json={**CUERPO, "etiquetas": ["luna de miel"]})

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["id"]
    assert cuerpo["nombre"] == "Ana Pérez"
    assert cuerpo["contacto"] == "ana@mail.test"
    assert cuerpo["segmento"] == "pareja"
    assert cuerpo["etiquetas"] == ["luna de miel"]
    assert cuerpo["no_recontactar"] is False
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert await _cantidad(sesion) == 1


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"contacto": "ana@mail.test", "segmento": "pareja"},
        {"nombre": "Ana Pérez", "segmento": "pareja"},
        {"nombre": "Ana Pérez", "contacto": "ana@mail.test"},
        {**CUERPO, "nombre": "   "},
        {**CUERPO, "contacto": ""},
        {**CUERPO, "segmento": "otro"},
    ],
)
async def test_rf002_datos_minimos_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf003_posible_duplicado_pide_confirmacion(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        segmento=SegmentoCliente("pareja"),
    )
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1  # sin alta


async def test_rf003_duplicado_por_contacto_con_otro_nombre(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="Carlos Gómez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1


async def test_rf003_duplicado_por_nombre_con_otro_contacto(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="ana pérez", contacto="+5491155550000")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1


async def test_rf003_confirmar_duplicado_crea_el_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="ana@mail.test")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json={**CUERPO, "confirmar_duplicado": True})

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf003_sin_parecidos_no_pide_confirmacion(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Carlos Gómez", contacto="+5491155550000")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf150_freelance_queda_asignado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)

    r = await c.post("/api/clientes", json={**CUERPO, "asesor_asignado_id": str(otro.id)})

    assert r.status_code == 201
    assert r.json()["asesor_asignado_id"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = (await sesion.execute(select(Cliente))).scalar_one()
    assert fila.asesor_asignado_id == c.usuario.id  # type: ignore[attr-defined]


async def test_rf001_asesor_inexistente_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={**CUERPO, "asesor_asignado_id": "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"},
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["errores"][0]["campo"] == "asesor_asignado_id"
    assert await _cantidad(sesion) == 0


async def test_rf001_asesor_inactivo_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    baja = await crear(sesion, UsuarioFactory, activo=False)

    r = await c.post("/api/clientes", json={**CUERPO, "asesor_asignado_id": str(baja.id)})

    assert r.status_code == 422
    assert r.json()["errores"][0]["campo"] == "asesor_asignado_id"
    assert await _cantidad(sesion) == 0


async def test_rf001_asesor_activo_queda_asignado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    asesor = await crear(sesion, UsuarioFactory)

    r = await c.post("/api/clientes", json={**CUERPO, "asesor_asignado_id": str(asesor.id)})

    assert r.status_code == 201
    assert r.json()["asesor_asignado_id"] == str(asesor.id)


async def test_rf003_freelance_no_ve_duplicados_ajenos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="ana@mail.test",
        asesor_asignado_id=ajeno.id,
    )
    c = await cliente_como("freelance")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 201
    assert "duplicados" not in r.json()
    assert await _cantidad(sesion) == 2


async def test_rf003_duplicado_por_nombre_sin_tildes_ni_espacios_de_mas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="ana  perez", contacto="+5491155550000")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]


async def test_rf003_el_409_trae_hasta_10_candidatos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    for _ in range(12):
        await crear(sesion, ClienteFactory, nombre="Ana Pérez")
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=CUERPO)

    assert r.status_code == 409
    assert len(r.json()["duplicados"]) == 10


# --- T-156: etiquetas de clientes en uso (RF-031, RF-151) -----------------------------------
# Contrato asumido: `GET /api/clientes/etiquetas` responde 200 con una lista JSON de strings.


async def test_rf031_lista_etiquetas_en_uso(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Playa", "Brasil"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["Familias"])
    await crear(sesion, ClienteFactory, nombre="Carla", etiquetas=[])
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes/etiquetas")

    assert r.status_code == 200, r.text
    assert r.json() == ["Brasil", "Familias", "Playa"]


async def test_rf031_etiquetas_sin_duplicados(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil", "Álamo"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["brasil", "alamo", "Zeta"])
    await crear(sesion, ClienteFactory, nombre="Carla", etiquetas=["BRASIL"])
    c = await cliente_como("dueno")

    r = await c.get("/api/clientes/etiquetas")

    assert r.status_code == 200, r.text
    etiquetas = r.json()
    claves = [e.lower().replace("á", "a") for e in etiquetas]
    assert claves == ["alamo", "brasil", "zeta"]


@pytest.mark.parametrize("rol", ROLES)
async def test_rf031_todos_los_roles_pueden_consultar_las_etiquetas(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana",
        etiquetas=["Brasil"],
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r = await c.get("/api/clientes/etiquetas")

    assert r.status_code == 200, r.text
    assert r.json() == ["Brasil"]


async def test_rf151_freelance_ve_solo_sus_etiquetas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana",
        etiquetas=["Propia"],
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )
    await crear(
        sesion, ClienteFactory, nombre="Beto", etiquetas=["Ajena"], asesor_asignado_id=otro.id
    )
    await crear(
        sesion, ClienteFactory, nombre="Carla", etiquetas=["SinAsesor"], asesor_asignado_id=None
    )

    r = await c.get("/api/clientes/etiquetas")

    assert r.status_code == 200, r.text
    assert r.json() == ["Propia"]


async def test_rf031_etiqueta_listada_filtra_todas_sus_variantes(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    for nombre, etiqueta in [("Ana", "Brasil"), ("Beto", "brasil"), ("Carla", " BRASIL ")]:
        await crear(sesion, ClienteFactory, nombre=nombre, etiquetas=[etiqueta])
    c = await cliente_como("empleado")

    listadas = (await c.get("/api/clientes/etiquetas")).json()
    r = await c.get("/api/clientes", params={"etiquetas": listadas[0]})

    assert len(listadas) == 1
    assert r.json()["total"] == 3


# --- T-157: topes de etiquetas del alta y la edición (RF-031) -------------------------------
# Mismas constantes que el filtro de `GET /clientes`: hasta 20 etiquetas de hasta 80 caracteres.

MAX_ETIQUETAS = 20
MAX_LARGO_ETIQUETA = 80
ID_EDICION = "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11"


async def test_rf031_alta_rechaza_mas_de_20_etiquetas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    etiquetas = [f"etiqueta {i}" for i in range(MAX_ETIQUETAS + 1)]

    r = await c.post("/api/clientes", json={**CUERPO, "etiquetas": etiquetas})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf031_alta_rechaza_etiqueta_de_mas_de_80_caracteres(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes", json={**CUERPO, "etiquetas": ["x" * (MAX_LARGO_ETIQUETA + 1)]}
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf031_alta_acepta_20_etiquetas_de_80_caracteres(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    etiquetas = [f"{i:02d}".ljust(MAX_LARGO_ETIQUETA, "x") for i in range(MAX_ETIQUETAS)]

    r = await c.post("/api/clientes", json={**CUERPO, "etiquetas": etiquetas})

    assert r.status_code == 201
    assert r.json()["etiquetas"] == etiquetas
    assert await _cantidad(sesion) == 1


async def test_rf031_edicion_rechaza_mas_de_20_etiquetas(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")
    etiquetas = [f"etiqueta {i}" for i in range(MAX_ETIQUETAS + 1)]

    r = await c.patch(f"/api/clientes/{ID_EDICION}", json={"etiquetas": etiquetas})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf031_edicion_rechaza_etiqueta_de_mas_de_80_caracteres(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{ID_EDICION}", json={"etiquetas": ["x" * (MAX_LARGO_ETIQUETA + 1)]}
    )

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf031_edicion_acepta_20_etiquetas_de_80_caracteres(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")
    etiquetas = [f"{i:02d}".ljust(MAX_LARGO_ETIQUETA, "x") for i in range(MAX_ETIQUETAS)]

    r = await c.patch(f"/api/clientes/{ID_EDICION}", json={"etiquetas": etiquetas})

    # El PATCH todavía no está implementado (501): el borde solo no debe caer en la validación.
    assert r.status_code != 422


async def test_rf031_get_clientes_ya_no_acepta_el_alias_etiqueta(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana", etiquetas=["Brasil"])
    await crear(sesion, ClienteFactory, nombre="Beto", etiquetas=["Europa"])
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"etiqueta": "Brasil"})

    # Sin el alias, el parámetro se ignora: no filtra.
    assert r.status_code == 200
    assert r.json()["total"] == 2


# --- T-043: historial del cliente (CU-03 paso 3, RF-006) ------------------------------------
# Supuesto: oportunidades se ordenan por `created_at` desc; viajes por `fecha_salida` desc;
# reseñas por `fecha` desc (la oportunidad no tiene otra fecha propia).


def _ids(items: list[dict[str, Any]]) -> list[str]:
    return [i["id"] for i in items]


async def test_rf006_historial_ordenado(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    usuario = c.usuario  # type: ignore[attr-defined]
    cliente = await crear(sesion, ClienteFactory)
    ajeno = await crear(sesion, ClienteFactory)
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)

    async def oportunidad(cli: Any, anio: int) -> Any:
        return await crear(
            sesion,
            OportunidadFactory,
            cliente_id=cli.id,
            responsable_id=usuario.id,
            created_at=datetime(anio, 3, 1, tzinfo=UTC),
        )

    async def viaje(cli: Any, salida: date) -> Any:
        return await crear(
            sesion,
            ViajeFactory,
            cliente_id=cli.id,
            responsable_id=usuario.id,
            destino_id=destino.id,
            fecha_salida=salida,
            fecha_regreso=salida,
        )

    async def resena(cli: Any, fecha: date) -> Any:
        return await crear(sesion, ResenaFactory, cliente_id=cli.id, hotel_id=hotel.id, fecha=fecha)

    o_vieja = await oportunidad(cliente, 2024)
    o_nueva = await oportunidad(cliente, 2026)
    o_media = await oportunidad(cliente, 2025)
    v_viejo = await viaje(cliente, date(2025, 1, 10))
    v_nuevo = await viaje(cliente, date(2027, 1, 10))
    r_vieja = await resena(cliente, date(2025, 2, 1))
    r_nueva = await resena(cliente, date(2027, 2, 1))
    await oportunidad(ajeno, 2026)
    await viaje(ajeno, date(2028, 1, 10))
    await resena(ajeno, date(2028, 2, 1))

    r = await c.get(f"/api/clientes/{cliente.id}/historial")

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert _ids(cuerpo["oportunidades"]) == [str(o.id) for o in (o_nueva, o_media, o_vieja)]
    assert _ids(cuerpo["viajes"]) == [str(v_nuevo.id), str(v_viejo.id)]
    assert _ids(cuerpo["resenas"]) == [str(r_nueva.id), str(r_vieja.id)]
    assert cuerpo["oportunidades"][0]["destino_consultado"] == "Bariloche"
    assert cuerpo["viajes"][0]["destino_id"] == str(destino.id)
    assert cuerpo["resenas"][0]["hotel_id"] == str(hotel.id)
    assert cuerpo["resenas"][0]["puntaje"] == 5


async def test_rf006_sin_historial(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    cliente = await crear(sesion, ClienteFactory)

    r = await c.get(f"/api/clientes/{cliente.id}/historial")

    assert r.status_code == 200, r.text
    assert r.json() == {"oportunidades": [], "viajes": [], "resenas": []}


async def test_rf151_historial_de_cliente_ajeno_404_para_freelance(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    ajeno = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)
    propio = await crear(
        sesion,
        ClienteFactory,
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r_ajeno = await c.get(f"/api/clientes/{ajeno.id}/historial")
    r_propio = await c.get(f"/api/clientes/{propio.id}/historial")

    assert r_ajeno.status_code == 404
    assert r_ajeno.headers["content-type"].startswith(PROBLEM_JSON)
    assert r_propio.status_code == 200, r_propio.text


async def test_rf006_historial_de_cliente_inexistente_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get(f"/api/clientes/{uuid4()}/historial")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
