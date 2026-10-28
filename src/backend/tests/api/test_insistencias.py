"""T-065: interacciones e insistencias del seguimiento de la oportunidad (CU-05 A1; RF-014,
RF-015, RF-018, RF-019, RF-151)."""

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Alerta,
    EstadoAlerta,
    EstadoOportunidad,
    MotivoPerdida,
    Oportunidad,
    TipoAlerta,
)
from tests.fabricas import AlertaFactory, ClienteFactory, OportunidadFactory, UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
E = EstadoOportunidad
CUERPO = {"fecha": "2026-11-10", "descripcion": "Volver a llamar por la cotización"}


async def _op(
    sesion: AsyncSession, responsable_id: UUID, estado: E = E.en_gestion, **campos: Any
) -> Oportunidad:
    if estado is E.perdida:
        campos.setdefault("motivo_perdida", MotivoPerdida.precio)
    cliente = await crear(sesion, ClienteFactory)
    return await crear(
        sesion,
        OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=estado,
        **campos,
    )


def _url(op: Oportunidad | UUID) -> str:
    id_ = op.id if isinstance(op, Oportunidad) else op
    return f"/api/oportunidades/{id_}/insistencias"


async def _alertas_de(sesion: AsyncSession, op: Oportunidad) -> list[Alerta]:
    filas = await sesion.scalars(select(Alerta).where(Alerta.oportunidad_id == op.id))
    return list(filas)


# ---------- RF-014: interacción de seguimiento ----------


async def test_rf014_interaccion(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    nota = "Llamé: le interesa Cancún en enero. Próximo paso: mandar cotización."

    r = await c.patch(f"/api/oportunidades/{op.id}", json={"notas": nota})

    assert r.status_code == 200
    assert r.json()["notas"] == nota
    detalle = await c.get(f"/api/oportunidades/{op.id}")
    assert detalle.json()["notas"] == nota
    await sesion.refresh(op)
    assert op.notas == nota


# ---------- RF-015: agendar una insistencia ----------


async def test_rf015_agendar_insistencia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    usuario = c.usuario  # type: ignore[attr-defined]
    op = await _op(sesion, usuario.id)

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["tipo"] == "insistencia"
    assert cuerpo["estado"] == "pendiente"
    assert cuerpo["fecha"] == CUERPO["fecha"]
    assert cuerpo["descripcion"] == CUERPO["descripcion"]
    assert cuerpo["oportunidad_id"] == str(op.id)
    assert cuerpo["propietario_id"] == str(usuario.id)
    assert cuerpo["contexto"]["oportunidad"]["id"] == str(op.id)
    guardadas = await _alertas_de(sesion, op)
    assert len(guardadas) == 1
    assert guardadas[0].tipo is TipoAlerta.insistencia
    assert guardadas[0].estado is EstadoAlerta.pendiente


@pytest.mark.parametrize("estado", [E.nueva, E.en_gestion, E.cotizada])
async def test_rf015_agendar_en_oportunidad_abierta(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, estado)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201


@pytest.mark.parametrize(
    "cuerpo",
    [
        {},
        {"descripcion": "Llamar"},
        {"fecha": "2026-11-10"},
        {"fecha": "no-es-fecha", "descripcion": "Llamar"},
        {"fecha": "2026-11-10", "descripcion": ""},
    ],
    ids=["vacio", "sin_fecha", "sin_descripcion", "fecha_invalida", "descripcion_vacia"],
)
async def test_rf015_datos_invalidos_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _alertas_de(sesion, op) == []


async def test_rf015_oportunidad_inexistente_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_url(uuid4()), json=CUERPO)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# ---------- permisos de escritura (RF-151, DEC-0005) ----------


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_responsable_agenda_insistencia(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_direccion_agenda_en_ajena_para_el_responsable(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    responsable = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, responsable.id)

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 201
    assert r.json()["propietario_id"] == str(responsable.id)  # la alerta es del responsable


async def test_rf151_empleado_no_responsable_403(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, otro.id)

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 403
    assert await _alertas_de(sesion, op) == []


async def test_rf151_freelance_ajena_404(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, otro.id)

    r = await c.post(_url(op), json=CUERPO)

    assert r.status_code == 404
    assert await _alertas_de(sesion, op) == []


# ---------- RF-019: reagendar si no hubo respuesta (A1) ----------


async def test_rf019_reagendar(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    usuario = c.usuario  # type: ignore[attr-defined]
    op = await _op(sesion, usuario.id)
    vencida = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
    )

    r = await c.post(_url(op), json={"fecha": "2026-11-20", "descripcion": "Segundo intento"})

    assert r.status_code == 201
    nueva = r.json()
    assert nueva["id"] != str(vencida.id)
    assert nueva["tipo"] == "insistencia"
    assert nueva["estado"] == "pendiente"
    assert nueva["fecha"] == "2026-11-20"
    assert nueva["oportunidad_id"] == str(op.id)
    pendientes_futuras = [
        a
        for a in await _alertas_de(sesion, op)
        if a.estado is EstadoAlerta.pendiente and a.fecha.isoformat() == "2026-11-20"
    ]
    assert len(pendientes_futuras) == 1


async def test_rf019_reagendar_posponiendo_la_insistencia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    creada = await c.post(_url(op), json=CUERPO)

    r = await c.post(f"/api/alertas/{creada.json()['id']}/posponer", json={"fecha": "2026-11-30"})

    assert creada.status_code == 201
    assert r.status_code == 200
    assert r.json()["fecha"] == "2026-11-30"
    assert r.json()["tipo"] == "insistencia"


# ---------- RF-018: cerrar resuelve las insistencias ----------


@pytest.mark.parametrize(
    ("accion", "cuerpo"), [("perder", {"motivo_perdida": "sin_respuesta"}), ("ganar", None)]
)
async def test_rf018_cerrar_resuelve_insistencias(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    accion: str,
    cuerpo: dict[str, Any] | None,
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]
    primera = await c.post(_url(op), json=CUERPO)
    segunda = await c.post(_url(op), json={"fecha": "2026-11-20", "descripcion": "Otra vez"})

    r = await c.post(f"/api/oportunidades/{op.id}/{accion}", json=cuerpo)

    assert primera.status_code == segunda.status_code == 201
    assert r.status_code == 200
    insistencias = [a for a in await _alertas_de(sesion, op) if a.tipo is TipoAlerta.insistencia]
    assert len(insistencias) == 2
    for alerta in insistencias:
        await sesion.refresh(alerta)
        assert alerta.estado is EstadoAlerta.resuelta
        assert alerta.resuelta_en is not None
