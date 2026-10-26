"""T-063: embudo de oportunidades, detalle y edición de datos y notas (CU-05, RF-016, RF-151)."""

from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoOportunidad, Oportunidad
from tests.fabricas import ClienteFactory, OportunidadFactory, UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


async def _oportunidad(
    sesion: AsyncSession, responsable_id: UUID, cliente_id: UUID | None = None, **campos: Any
) -> Oportunidad:
    if cliente_id is None:
        cliente_id = (await crear(sesion, ClienteFactory)).id
    return await crear(
        sesion, OportunidadFactory, cliente_id=cliente_id, responsable_id=responsable_id, **campos
    )


def _ids(items: list[dict[str, Any]]) -> set[str]:
    return {i["id"] for i in items}


async def test_rf016_embudo_por_estado(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    nueva = await _oportunidad(sesion, otro.id, estado=EstadoOportunidad.nueva)
    en_gestion = await _oportunidad(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        estado=EstadoOportunidad.en_gestion,
    )
    cotizada = await _oportunidad(sesion, otro.id, estado=EstadoOportunidad.cotizada)

    todas = await c.get("/api/oportunidades")
    solo_nuevas = await c.get("/api/oportunidades", params={"estado": "nueva"})

    assert todas.status_code == 200
    assert todas.json()["total"] == 3
    assert _ids(todas.json()["items"]) == {str(nueva.id), str(en_gestion.id), str(cotizada.id)}
    assert solo_nuevas.status_code == 200
    assert _ids(solo_nuevas.json()["items"]) == {str(nueva.id)}
    assert solo_nuevas.json()["items"][0]["estado"] == "nueva"


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado"])
async def test_rf016_mios_filtra_las_asignadas(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    mia = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]
    await _oportunidad(sesion, otro.id)

    r = await c.get("/api/oportunidades", params={"mios": "true"})

    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert _ids(r.json()["items"]) == {str(mia.id)}


async def test_rf016_filtra_por_cliente(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("dueno")
    otro = await crear(sesion, UsuarioFactory)
    cli = await crear(sesion, ClienteFactory)
    buscada = await _oportunidad(sesion, otro.id, cliente_id=cli.id)
    await _oportunidad(sesion, otro.id)

    r = await c.get("/api/oportunidades", params={"cliente_id": str(cli.id)})

    assert r.status_code == 200
    assert _ids(r.json()["items"]) == {str(buscada.id)}


async def test_rf016_paginado(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    for _ in range(3):
        await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.get("/api/oportunidades", params={"pagina": 2, "por_pagina": 2})

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["total"] == 3
    assert cuerpo["pagina"] == 2
    assert cuerpo["por_pagina"] == 2
    assert len(cuerpo["items"]) == 1


async def test_rf016_estado_invalido_422(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/oportunidades", params={"estado": "inexistente"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf151_freelance_solo_lo_suyo(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    mia = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]
    await _oportunidad(sesion, otro.id)

    r = await c.get("/api/oportunidades")

    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert _ids(r.json()["items"]) == {str(mia.id)}


async def test_rf151_freelance_no_ve_ajenas_aunque_filtre_por_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    cli = await crear(sesion, ClienteFactory)
    await _oportunidad(sesion, otro.id, cliente_id=cli.id)

    r = await c.get("/api/oportunidades", params={"cliente_id": str(cli.id)})

    assert r.status_code == 200
    assert r.json()["total"] == 0
    assert r.json()["items"] == []


async def test_rf016_obtener_oportunidad(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    op = await _oportunidad(sesion, otro.id, destino_consultado="Bariloche", pasajeros=3)

    r = await c.get(f"/api/oportunidades/{op.id}")

    assert r.status_code == 200
    assert r.json()["id"] == str(op.id)
    assert r.json()["cliente_id"] == str(op.cliente_id)
    assert r.json()["responsable_id"] == str(otro.id)
    assert r.json()["destino_consultado"] == "Bariloche"
    assert r.json()["pasajeros"] == 3
    assert r.json()["estado"] == "nueva"


async def test_rf016_obtener_inexistente_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get(f"/api/oportunidades/{uuid4()}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf151_freelance_oportunidad_ajena_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    ajena = await _oportunidad(sesion, otro.id)

    r = await c.get(f"/api/oportunidades/{ajena.id}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf151_freelance_patch_de_ajena_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    ajena = await _oportunidad(sesion, otro.id, notas="original")

    r = await c.patch(f"/api/oportunidades/{ajena.id}", json={"notas": "pisada"})

    assert r.status_code == 404
    await sesion.refresh(ajena)
    assert ajena.notas == "original"


async def test_rf016_patch_edita_datos_y_notas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.patch(
        f"/api/oportunidades/{op.id}",
        json={
            "destino_consultado": "Mendoza",
            "pasajeros": 4,
            "canal": "instagram",
            "fecha_desde_tentativa": "2026-12-10",
            "fecha_hasta_tentativa": "2026-12-20",
            "notas": "Prefiere vuelo de mañana",
        },
    )

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["destino_consultado"] == "Mendoza"
    assert cuerpo["pasajeros"] == 4
    assert cuerpo["canal"] == "instagram"
    assert cuerpo["fecha_desde_tentativa"] == "2026-12-10"
    assert cuerpo["fecha_hasta_tentativa"] == "2026-12-20"
    assert cuerpo["notas"] == "Prefiere vuelo de mañana"
    await sesion.refresh(op)
    assert op.destino_consultado == "Mendoza"
    assert op.notas == "Prefiere vuelo de mañana"


async def test_rf016_freelance_edita_la_suya(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    op = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"notas": "Llamar el lunes"})

    assert r.status_code == 200
    assert r.json()["notas"] == "Llamar el lunes"


async def test_patch_no_cambia_estado(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op = await _oportunidad(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        estado=EstadoOportunidad.en_gestion,
    )

    r = await c.patch(
        f"/api/oportunidades/{op.id}", json={"notas": "Nueva nota", "estado": "ganada"}
    )

    # El estado no se edita por PATCH: se ignora y el resto del cuerpo se aplica.
    assert r.status_code == 200
    assert r.json()["estado"] == "en_gestion"
    assert r.json()["notas"] == "Nueva nota"
    await sesion.refresh(op)
    assert op.estado == EstadoOportunidad.en_gestion
    assert op.notas == "Nueva nota"


async def test_patch_solo_notas_no_pisa_los_otros_campos(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _oportunidad(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        destino_consultado="Salta",
        pasajeros=5,
        fecha_desde_tentativa=date(2026, 12, 10),
        fecha_hasta_tentativa=date(2026, 12, 20),
    )

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"notas": "Solo notas"})

    assert r.status_code == 200
    assert r.json()["destino_consultado"] == "Salta"
    assert r.json()["pasajeros"] == 5
    assert r.json()["fecha_desde_tentativa"] == "2026-12-10"
    assert r.json()["fecha_hasta_tentativa"] == "2026-12-20"


async def test_patch_fecha_hasta_anterior_a_la_guardada_responde_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _oportunidad(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        fecha_desde_tentativa=date(2026, 12, 10),
        fecha_hasta_tentativa=date(2026, 12, 20),
    )

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"fecha_hasta_tentativa": "2026-12-01"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.fecha_hasta_tentativa == date(2026, 12, 20)


async def test_patch_fecha_desde_posterior_a_la_guardada_responde_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _oportunidad(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        fecha_desde_tentativa=date(2026, 12, 10),
        fecha_hasta_tentativa=date(2026, 12, 20),
    )

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"fecha_desde_tentativa": "2026-12-30"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.fecha_desde_tentativa == date(2026, 12, 10)


async def test_patch_una_sola_fecha_en_orden_responde_200(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _oportunidad(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        fecha_desde_tentativa=date(2026, 12, 10),
        fecha_hasta_tentativa=date(2026, 12, 20),
    )

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"fecha_hasta_tentativa": "2026-12-25"})

    assert r.status_code == 200
    assert r.json()["fecha_hasta_tentativa"] == "2026-12-25"


async def test_patch_inexistente_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/oportunidades/{uuid4()}", json={"notas": "x"})

    assert r.status_code == 404


async def test_rf151_empleado_no_responsable_patch_403(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    ajena = await _oportunidad(sesion, otro.id, notas="original")

    r = await c.patch(f"/api/oportunidades/{ajena.id}", json={"notas": "pisada"})

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(ajena)
    assert ajena.notas == "original"


async def test_rf151_freelance_ve_por_su_cliente_pero_no_es_responsable_patch_403(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    cli = await crear(
        sesion,
        ClienteFactory,
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )
    op = await _oportunidad(sesion, otro.id, cliente_id=cli.id, notas="original")

    visto = await c.get(f"/api/oportunidades/{op.id}")
    editado = await c.patch(f"/api/oportunidades/{op.id}", json={"notas": "pisada"})

    assert visto.status_code == 200
    assert editado.status_code == 403
    assert editado.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.notas == "original"


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf016_admin_y_dueno_editan_ajena_200(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    ajena = await _oportunidad(sesion, otro.id)

    r = await c.patch(f"/api/oportunidades/{ajena.id}", json={"notas": "Editada"})

    assert r.status_code == 200
    assert r.json()["notas"] == "Editada"
    await sesion.refresh(ajena)
    assert ajena.notas == "Editada"


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf016_reasignar_responsable_solo_admin_o_dueno_403(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    nuevo = await crear(sesion, UsuarioFactory, activo=True)
    op = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"responsable_id": str(nuevo.id)})

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.responsable_id == c.usuario.id  # type: ignore[attr-defined]


@pytest.mark.parametrize("destino", ["inexistente", "de_baja"])
async def test_rf016_reasignar_a_usuario_inexistente_o_de_baja_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, destino: str
) -> None:
    c = await cliente_como("admin")
    op = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]
    if destino == "inexistente":
        nuevo_id = uuid4()
    else:
        nuevo_id = (await crear(sesion, UsuarioFactory, activo=False)).id

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"responsable_id": str(nuevo_id)})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.responsable_id == c.usuario.id  # type: ignore[attr-defined]


async def test_rf016_admin_reasigna_200(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory)
    nuevo = await crear(sesion, UsuarioFactory, activo=True)
    op = await _oportunidad(sesion, otro.id)

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"responsable_id": str(nuevo.id)})

    assert r.status_code == 200
    assert r.json()["responsable_id"] == str(nuevo.id)
    await sesion.refresh(op)
    assert op.responsable_id == nuevo.id


async def test_rf016_responsable_que_manda_su_propio_responsable_id_edita_200(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = c.usuario.id  # type: ignore[attr-defined]
    op = await _oportunidad(sesion, yo)

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"notas": "x", "responsable_id": str(yo)})

    assert r.status_code == 200
    await sesion.refresh(op)
    assert op.notas == "x"
    assert op.responsable_id == yo
