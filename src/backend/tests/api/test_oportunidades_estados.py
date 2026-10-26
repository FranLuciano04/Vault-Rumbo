"""T-064: acciones de estado de la oportunidad: en gestión, perder, reactivar y ganar sin
cotización (CU-05 A2, A3, A4; RF-016, RF-017, RF-020; EST-Oportunidad)."""

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
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


async def _op(
    sesion: AsyncSession, responsable_id: UUID, estado: E = E.nueva, **campos: Any
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


def _url(op: Oportunidad | UUID, accion: str) -> str:
    id_ = op.id if isinstance(op, Oportunidad) else op
    return f"/api/oportunidades/{id_}/{accion}"


# ---------- en gestión (T2) ----------


async def test_cu05_en_gestion_desde_nueva(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "en-gestion"))

    assert r.status_code == 200
    assert r.json()["id"] == str(op.id)
    assert r.json()["estado"] == "en_gestion"
    await sesion.refresh(op)
    assert op.estado is E.en_gestion


@pytest.mark.parametrize("origen", [E.en_gestion, E.cotizada, E.ganada, E.perdida])
async def test_cu05_en_gestion_invalida_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "en-gestion"))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.estado is origen


# ---------- perder (T5, A2) ----------


@pytest.mark.parametrize("origen", [E.nueva, E.en_gestion, E.cotizada])
async def test_rf017_perder_con_motivo(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "perder"), json={"motivo_perdida": "precio"})

    assert r.status_code == 200
    assert r.json()["estado"] == "perdida"
    assert r.json()["motivo_perdida"] == "precio"
    await sesion.refresh(op)
    assert op.estado is E.perdida
    assert op.motivo_perdida is MotivoPerdida.precio


async def test_rf017_perder_otro_con_detalle(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(
        _url(op, "perder"),
        json={"motivo_perdida": "otro", "motivo_perdida_detalle": "Postergó el viaje"},
    )

    assert r.status_code == 200
    assert r.json()["motivo_perdida"] == "otro"
    assert r.json()["motivo_perdida_detalle"] == "Postergó el viaje"


@pytest.mark.parametrize(
    "cuerpo",
    [
        {},
        {"motivo_perdida": "inventado"},
        {"motivo_perdida": "otro"},
        {"motivo_perdida": "otro", "motivo_perdida_detalle": ""},
    ],
    ids=["sin_motivo", "motivo_fuera_del_enum", "otro_sin_detalle", "otro_detalle_vacio"],
)
async def test_rf017_perder_motivo_invalido_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, E.en_gestion)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "perder"), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(op)
    assert op.estado is E.en_gestion
    assert op.motivo_perdida is None


@pytest.mark.parametrize("origen", [E.ganada, E.perdida])
async def test_rf017_perder_desde_terminal_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "perder"), json={"motivo_perdida": "desistio"})

    assert r.status_code == 409
    await sesion.refresh(op)
    assert op.estado is origen


async def test_rf017_perder_resuelve_las_insistencias_pendientes(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    usuario = c.usuario  # type: ignore[attr-defined]
    op = await _op(sesion, usuario.id, E.en_gestion)
    insistencia = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
    )
    insistencia_vista = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
        estado=EstadoAlerta.vista,
    )
    manual = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.manual,
    )

    r = await c.post(_url(op, "perder"), json={"motivo_perdida": "sin_respuesta"})

    assert r.status_code == 200
    await sesion.refresh(insistencia)
    await sesion.refresh(insistencia_vista)
    await sesion.refresh(manual)
    assert insistencia.estado is EstadoAlerta.resuelta
    assert insistencia_vista.estado is EstadoAlerta.resuelta
    assert manual.estado is EstadoAlerta.pendiente  # lo manual no se cierra solo (RN-08)


# ---------- reactivar (T8, A3) ----------


async def test_rf020_reactivar(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op = await _op(
        sesion,
        c.usuario.id,  # type: ignore[attr-defined]
        E.perdida,
        motivo_perdida=MotivoPerdida.otro,
        motivo_perdida_detalle="Postergó",
    )

    r = await c.post(_url(op, "reactivar"))

    assert r.status_code == 200
    assert r.json()["estado"] == "en_gestion"
    assert r.json()["motivo_perdida"] is None
    assert r.json()["motivo_perdida_detalle"] is None
    await sesion.refresh(op)
    assert op.estado is E.en_gestion
    assert op.motivo_perdida is None


@pytest.mark.parametrize("origen", [E.nueva, E.en_gestion, E.cotizada, E.ganada])
async def test_rf020_reactivar_si_no_esta_perdida_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "reactivar"))

    assert r.status_code == 409
    await sesion.refresh(op)
    assert op.estado is origen


# ---------- ganar sin cotización (T4, A4) ----------


@pytest.mark.parametrize("origen", [E.nueva, E.en_gestion, E.cotizada])
async def test_rf016_ganar_sin_cotizacion(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "ganar"))

    assert r.status_code == 200
    assert r.json()["estado"] == "ganada"
    await sesion.refresh(op)
    assert op.estado is E.ganada


@pytest.mark.parametrize("origen", [E.ganada, E.perdida])
async def test_rf016_ganar_desde_terminal_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, "ganar"))

    assert r.status_code == 409
    await sesion.refresh(op)
    assert op.estado is origen


async def test_rf016_ganar_resuelve_las_insistencias_pendientes(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    usuario = c.usuario  # type: ignore[attr-defined]
    op = await _op(sesion, usuario.id, E.en_gestion)
    insistencia = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
    )
    insistencia_vista = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
        estado=EstadoAlerta.vista,
    )

    r = await c.post(_url(op, "ganar"))

    assert r.status_code == 200
    await sesion.refresh(insistencia)
    await sesion.refresh(insistencia_vista)
    assert insistencia.estado is EstadoAlerta.resuelta
    assert insistencia_vista.estado is EstadoAlerta.resuelta


async def test_rf020_reactivar_no_reabre_las_alertas_resueltas_al_perder(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    usuario = c.usuario  # type: ignore[attr-defined]
    op = await _op(sesion, usuario.id, E.en_gestion)
    insistencia = await crear(
        sesion,
        AlertaFactory,
        propietario_id=usuario.id,
        oportunidad_id=op.id,
        tipo=TipoAlerta.insistencia,
    )

    perdida = await c.post(_url(op, "perder"), json={"motivo_perdida": "precio"})
    reactivada = await c.post(_url(op, "reactivar"))

    assert perdida.status_code == 200
    assert reactivada.status_code == 200
    await sesion.refresh(insistencia)
    assert insistencia.estado is EstadoAlerta.resuelta


# ---------- permisos de escritura (RF-151, DEC-0005) ----------

_ACCIONES: list[tuple[str, dict[str, Any] | None, E]] = [
    ("en-gestion", None, E.nueva),
    ("perder", {"motivo_perdida": "precio"}, E.nueva),
    ("reactivar", None, E.perdida),
    ("ganar", None, E.nueva),
]
_IDS = ["en_gestion", "perder", "reactivar", "ganar"]


@pytest.mark.parametrize(("accion", "cuerpo", "origen"), _ACCIONES, ids=_IDS)
@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_responsable_aplica_la_accion(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    rol: str,
    accion: str,
    cuerpo: dict[str, Any] | None,
    origen: E,
) -> None:
    c = await cliente_como(rol)
    op = await _op(sesion, c.usuario.id, origen)  # type: ignore[attr-defined]

    r = await c.post(_url(op, accion), json=cuerpo)

    assert r.status_code == 200


@pytest.mark.parametrize(("accion", "cuerpo", "origen"), _ACCIONES, ids=_IDS)
@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_admin_y_dueno_aplican_en_ajena(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    rol: str,
    accion: str,
    cuerpo: dict[str, Any] | None,
    origen: E,
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, otro.id, origen)

    r = await c.post(_url(op, accion), json=cuerpo)

    assert r.status_code == 200


@pytest.mark.parametrize(("accion", "cuerpo", "origen"), _ACCIONES, ids=_IDS)
async def test_rf151_empleado_no_responsable_403(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    accion: str,
    cuerpo: dict[str, Any] | None,
    origen: E,
) -> None:
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, otro.id, origen)

    r = await c.post(_url(op, accion), json=cuerpo)

    assert r.status_code == 403
    await sesion.refresh(op)
    assert op.estado is origen


@pytest.mark.parametrize(("accion", "cuerpo", "origen"), _ACCIONES, ids=_IDS)
async def test_rf151_freelance_ajena_404(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    accion: str,
    cuerpo: dict[str, Any] | None,
    origen: E,
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, otro.id, origen)

    r = await c.post(_url(op, accion), json=cuerpo)

    assert r.status_code == 404
    await sesion.refresh(op)
    assert op.estado is origen


@pytest.mark.parametrize(("accion", "cuerpo", "origen"), _ACCIONES, ids=_IDS)
async def test_cu05_accion_sobre_inexistente_404(
    cliente_como: FabricaCliente, accion: str, cuerpo: dict[str, Any] | None, origen: E
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_url(uuid4(), accion), json=cuerpo)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# ---------- el permiso se chequea antes que el estado (RF-151) ----------


@pytest.mark.parametrize(
    ("accion", "cuerpo", "origen"),
    [
        ("en-gestion", None, E.ganada),
        ("en-gestion", None, E.perdida),
        ("en-gestion", None, E.en_gestion),
        ("perder", {"motivo_perdida": "precio"}, E.ganada),
        ("perder", {"motivo_perdida": "precio"}, E.perdida),
        ("reactivar", None, E.nueva),
        ("reactivar", None, E.ganada),
        ("ganar", None, E.ganada),
        ("ganar", None, E.perdida),
    ],
    ids=lambda v: v.value if isinstance(v, E) else None,
)
async def test_rf151_sin_permiso_gana_el_403_al_409(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    accion: str,
    cuerpo: dict[str, Any] | None,
    origen: E,
) -> None:
    """Un empleado no responsable sobre una transición inválida recibe 403, no 409: si no, el
    409 le revelaría el estado de una oportunidad que no puede tocar."""
    c = await cliente_como("empleado")
    otro = await crear(sesion, UsuarioFactory)
    op = await _op(sesion, otro.id, origen)

    r = await c.post(_url(op, accion), json=cuerpo)

    assert r.status_code == 403
    await sesion.refresh(op)
    assert op.estado is origen
