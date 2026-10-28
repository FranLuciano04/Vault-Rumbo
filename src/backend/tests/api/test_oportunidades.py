"""T-062: registrar consulta (CU-04). T-063: embudo, detalle y edición (CU-05, RF-016, RF-151)."""

from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
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


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado"])
async def test_rf016_filtra_por_responsable(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    buscado = await crear(sesion, UsuarioFactory)
    otro = await crear(sesion, UsuarioFactory)
    suya = await _oportunidad(sesion, buscado.id)
    await _oportunidad(sesion, otro.id)
    await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.get("/api/oportunidades", params={"responsable_id": str(buscado.id)})

    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert _ids(r.json()["items"]) == {str(suya.id)}


async def test_rf016_mios_gana_sobre_responsable_id(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory)
    mia = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]
    await _oportunidad(sesion, otro.id)

    r = await c.get("/api/oportunidades", params={"mios": "true", "responsable_id": str(otro.id)})

    assert r.status_code == 200
    assert _ids(r.json()["items"]) == {str(mia.id)}


async def test_rf151_freelance_no_ve_ajenas_aunque_pida_otro_responsable(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    await _oportunidad(sesion, otro.id)
    mia = await _oportunidad(sesion, c.usuario.id)  # type: ignore[attr-defined]

    ajenas = await c.get("/api/oportunidades", params={"responsable_id": str(otro.id)})
    propias = await c.get(
        "/api/oportunidades",
        params={"responsable_id": str(c.usuario.id)},  # type: ignore[attr-defined]
    )

    assert ajenas.status_code == 200
    assert ajenas.json()["items"] == []
    assert ajenas.json()["total"] == 0
    assert _ids(propias.json()["items"]) == {str(mia.id)}


async def test_rf016_responsable_id_invalido_422(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("admin")

    r = await c.get("/api/oportunidades", params={"responsable_id": "no-es-uuid"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf016_listado_trae_el_nombre_del_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cli = await crear(sesion, ClienteFactory, nombre="Camila Benítez")
    op = await _oportunidad(sesion, c.usuario.id, cliente_id=cli.id)  # type: ignore[attr-defined]

    r = await c.get("/api/oportunidades")

    assert r.status_code == 200
    item = next(i for i in r.json()["items"] if i["id"] == str(op.id))
    assert item["cliente_nombre"] == "Camila Benítez"


async def test_rf016_detalle_trae_el_nombre_del_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cli = await crear(sesion, ClienteFactory, nombre="Familia Sosa")
    op = await _oportunidad(sesion, c.usuario.id, cliente_id=cli.id)  # type: ignore[attr-defined]

    r = await c.get(f"/api/oportunidades/{op.id}")

    assert r.status_code == 200
    assert r.json()["cliente_nombre"] == "Familia Sosa"


async def test_rf016_cliente_nombre_es_solo_lectura_en_patch(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cli = await crear(sesion, ClienteFactory, nombre="Joaquín Ramos")
    op = await _oportunidad(sesion, c.usuario.id, cliente_id=cli.id)  # type: ignore[attr-defined]

    r = await c.patch(
        f"/api/oportunidades/{op.id}", json={"notas": "x", "cliente_nombre": "Otro nombre"}
    )

    assert r.status_code == 200
    assert r.json()["cliente_nombre"] == "Joaquín Ramos"


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


# --- T-062: registrar una consulta como oportunidad (CU-04) -----------------------------------


def _consulta(**extra: Any) -> dict[str, Any]:
    return {"canal": "whatsapp", "destino_consultado": "Bariloche", "pasajeros": 2, **extra}


async def _cuenta(sesion: AsyncSession, modelo: type) -> int:
    return (await sesion.execute(select(func.count()).select_from(modelo))).scalar_one()


async def test_rf010_registrar_consulta(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    existente = await crear(sesion, ClienteFactory)

    r = await c.post(
        "/api/oportunidades",
        json=_consulta(
            cliente_id=str(existente.id),
            fecha_desde_tentativa="2027-01-10",
            fecha_hasta_tentativa="2027-01-20",
            notas="Viaja con chicos",
        ),
    )

    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["estado"] == "nueva"
    assert cuerpo["cliente_id"] == str(existente.id)
    assert cuerpo["cliente_nombre"] == existente.nombre
    assert cuerpo["responsable_id"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert cuerpo["canal"] == "whatsapp"
    assert cuerpo["destino_consultado"] == "Bariloche"
    assert cuerpo["pasajeros"] == 2
    assert cuerpo["fecha_desde_tentativa"] == "2027-01-10"
    assert cuerpo["notas"] == "Viaja con chicos"
    guardada = await sesion.get(Oportunidad, UUID(cuerpo["id"]))
    assert guardada is not None
    assert guardada.estado == EstadoOportunidad.nueva
    assert guardada.responsable_id == c.usuario.id  # type: ignore[attr-defined]


async def test_rf010_el_responsable_es_quien_registra_aunque_mande_otro(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    existente = await crear(sesion, ClienteFactory)

    r = await c.post(
        "/api/oportunidades",
        json=_consulta(cliente_id=str(existente.id), responsable_id=str(otro.id)),
    )

    assert r.status_code == 201, r.text
    assert r.json()["responsable_id"] == str(c.usuario.id)  # type: ignore[attr-defined]


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf010_todos_los_roles_registran_una_consulta(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    existente = await crear(
        sesion,
        ClienteFactory,
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )

    r = await c.post("/api/oportunidades", json=_consulta(cliente_id=str(existente.id)))

    assert r.status_code == 201, r.text


async def test_rf010_sin_sesion_401(cliente_sin_sesion: AsyncClient) -> None:
    r = await cliente_sin_sesion.post("/api/oportunidades", json=_consulta(cliente_id=str(uuid4())))

    assert r.status_code == 401


async def test_rf010_cliente_inexistente_422(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/oportunidades", json=_consulta(cliente_id=str(uuid4())))

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf010_freelance_sobre_cliente_ajeno_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    ajeno = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)

    r = await c.post("/api/oportunidades", json=_consulta(cliente_id=str(ajeno.id)))
    inexistente = await c.post("/api/oportunidades", json=_consulta(cliente_id=str(uuid4())))

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["errores"] == inexistente.json()["errores"]
    assert await _cuenta(sesion, Oportunidad) == 0


async def test_rf004_alta_rapida_de_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")

    alta = await c.post(
        "/api/clientes",
        json={"nombre": "Lucía Fernández", "contacto": "+54 9 11 4444-5555", "segmento": "pareja"},
    )
    assert alta.status_code == 201, alta.text
    r = await c.post("/api/oportunidades", json=_consulta(cliente_id=alta.json()["id"]))

    assert r.status_code == 201, r.text
    assert r.json()["cliente_id"] == alta.json()["id"]
    assert r.json()["cliente_nombre"] == "Lucía Fernández"
    assert r.json()["estado"] == "nueva"
    assert r.json()["responsable_id"] == str(c.usuario.id)  # type: ignore[attr-defined]


async def test_rf012_con_oportunidad_abierta_del_mismo_cliente_crea_otra(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    existente = await crear(sesion, ClienteFactory)
    abierta = await _oportunidad(
        sesion,
        c.usuario.id,
        existente.id,
        estado=EstadoOportunidad.en_gestion,  # type: ignore[attr-defined]
    )

    r = await c.post("/api/oportunidades", json=_consulta(cliente_id=str(existente.id)))

    assert r.status_code == 201, r.text
    assert r.json()["id"] != str(abierta.id)
    assert r.json()["estado"] == "nueva"
    assert await _cuenta(sesion, Oportunidad) == 2


@pytest.mark.parametrize(
    "estado",
    [EstadoOportunidad.nueva, EstadoOportunidad.en_gestion, EstadoOportunidad.cotizada],
)
async def test_rf012_oportunidad_abierta_avisa(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: EstadoOportunidad
) -> None:
    """Fija el contrato que usa el front (T-063): el aviso se arma con el listado filtrado por
    cliente y estado abierto."""
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    existente = await crear(sesion, ClienteFactory)
    abierta = await _oportunidad(sesion, otro.id, existente.id, estado=estado)
    await _oportunidad(sesion, otro.id)  # abierta de otro cliente: no debe aparecer

    r = await c.get(
        "/api/oportunidades", params={"cliente_id": str(existente.id), "estado": estado.value}
    )

    assert r.status_code == 200
    assert _ids(r.json()["items"]) == {str(abierta.id)}


@pytest.mark.parametrize("faltante", ["canal"])
async def test_rf013_datos_minimos_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, faltante: str
) -> None:
    c = await cliente_como("empleado")
    existente = await crear(sesion, ClienteFactory)
    cuerpo = _consulta(cliente_id=str(existente.id))
    del cuerpo[faltante]

    r = await c.post("/api/oportunidades", json=cuerpo)

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert faltante in {e["campo"] for e in r.json()["errores"]}
    assert await _cuenta(sesion, Oportunidad) == 0


async def test_rf013_consulta_solo_con_cliente_y_canal(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    existente = await crear(sesion, ClienteFactory)

    r = await c.post(
        "/api/oportunidades", json={"cliente_id": str(existente.id), "canal": "whatsapp"}
    )

    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["destino_consultado"] is None
    assert cuerpo["pasajeros"] is None
    assert cuerpo["estado"] == "nueva"
    assert await _cuenta(sesion, Oportunidad) == 1
    guardada = (await sesion.execute(select(Oportunidad))).scalar_one()
    assert guardada.destino_consultado is None
    assert guardada.pasajeros is None


@pytest.mark.parametrize(
    "invalido",
    [{"destino_consultado": ""}, {"destino_consultado": "x" * 201}, {"pasajeros": 0}],
)
async def test_rf013_destino_y_pasajeros_se_validan_si_vienen(
    cliente_como: FabricaCliente, sesion: AsyncSession, invalido: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    existente = await crear(sesion, ClienteFactory)
    base = {"cliente_id": str(existente.id), "canal": "whatsapp"}

    r = await c.post("/api/oportunidades", json={**base, **invalido})

    assert r.status_code == 422, r.text
    assert set(invalido) & {e["campo"] for e in r.json()["errores"]}
    assert await _cuenta(sesion, Oportunidad) == 0

    valido = await c.post(
        "/api/oportunidades", json={**base, "destino_consultado": "x" * 200, "pasajeros": 1}
    )
    assert valido.status_code == 201, valido.text


async def test_rf013_sin_cliente_422(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/oportunidades", json=_consulta())

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cuenta(sesion, Oportunidad) == 0


@pytest.mark.parametrize(
    "invalido",
    [
        {"canal": "telegrama"},
        {"destino_consultado": ""},
        {"pasajeros": 0},
        {"fecha_desde_tentativa": "2027-02-10", "fecha_hasta_tentativa": "2027-02-01"},
    ],
)
async def test_rf013_valores_invalidos_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, invalido: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    existente = await crear(sesion, ClienteFactory)

    r = await c.post("/api/oportunidades", json=_consulta(cliente_id=str(existente.id), **invalido))

    assert r.status_code == 422, r.text
