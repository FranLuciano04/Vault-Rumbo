"""T-067: marcar enviada y registrar la respuesta del cliente (CU-06 paso 4, A2, A3; RF-023,
RF-025; EST-Cotización T2-T4, EST-Oportunidad T3; RF-151).

El contrato (openapi.json) declara los tres POST sin cuerpo y la `Cotizacion` sin campo de motivo:
solo se prueba lo que ese contrato permite.
"""

from collections.abc import Awaitable, Callable
from datetime import timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Cotizacion,
    EstadoCotizacion,
    EstadoOportunidad,
    MotivoPerdida,
    Oportunidad,
)
from tests.fabricas import ClienteFactory, CotizacionFactory, OportunidadFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
E = EstadoOportunidad
C = EstadoCotizacion


async def _par(
    sesion: AsyncSession,
    responsable_id: UUID,
    *,
    cot: C = C.borrador,
    op: E = E.en_gestion,
    validez_hasta: Any = None,
) -> tuple[Oportunidad, Cotizacion]:
    campos: dict[str, Any] = {}
    if op is E.perdida:
        campos["motivo_perdida"] = MotivoPerdida.precio
    cliente = await crear(sesion, ClienteFactory)
    oportunidad = await crear(
        sesion,
        OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable_id,
        estado=op,
        **campos,
    )
    vigente = hoy() + timedelta(days=30) if validez_hasta is None else validez_hasta
    extra = {"validez_hasta": vigente}
    cotizacion = await crear(
        sesion, CotizacionFactory, oportunidad_id=oportunidad.id, estado=cot, **extra
    )
    return oportunidad, cotizacion


def _url(cotizacion: Cotizacion | UUID, accion: str) -> str:
    id_ = cotizacion.id if isinstance(cotizacion, Cotizacion) else cotizacion
    return f"/api/cotizaciones/{id_}/{accion}"


# ---------- enviar (T2, RF-023) ----------


async def test_rf023_enviar(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op, cot = await _par(sesion, c.usuario.id)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "enviar"))

    assert r.status_code == 200
    assert r.json()["id"] == str(cot.id)
    assert r.json()["estado"] == "enviada"
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is C.enviada
    assert op.estado is E.cotizada  # EST-Oportunidad T3


@pytest.mark.parametrize("origen", [E.nueva, E.en_gestion, E.cotizada])
async def test_rf023_enviar_deja_la_oportunidad_cotizada(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: E
) -> None:
    c = await cliente_como("empleado")
    op, cot = await _par(sesion, c.usuario.id, op=origen)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "enviar"))

    assert r.status_code == 200
    await sesion.refresh(op)
    assert op.estado is E.cotizada


@pytest.mark.parametrize("origen", [C.enviada, C.aceptada, C.rechazada, C.vencida])
async def test_rf023_enviar_invalida_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: C
) -> None:
    c = await cliente_como("empleado")
    _, cot = await _par(sesion, c.usuario.id, cot=origen, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "enviar"))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(cot)
    assert cot.estado is origen


@pytest.mark.parametrize("cerrada", [E.ganada, E.perdida])
async def test_rf023_enviar_con_oportunidad_cerrada_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, cerrada: E
) -> None:
    c = await cliente_como("empleado")
    op, cot = await _par(sesion, c.usuario.id, op=cerrada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "enviar"))

    assert r.status_code == 409
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is C.borrador
    assert op.estado is cerrada


# ---------- aceptar (T3, RF-025) ----------


async def test_rf025_aceptar(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op, cot = await _par(sesion, c.usuario.id, cot=C.enviada, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "aceptar"))

    assert r.status_code == 200
    assert r.json()["estado"] == "aceptada"
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is C.aceptada
    # Lista para confirmar la reserva (CU-07 parte de `cotizada` con la cotización aceptada);
    # ganar la oportunidad es de M6.
    assert op.estado is E.cotizada


async def test_aceptar_vencida_409(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op, cot = await _par(sesion, c.usuario.id, cot=C.vencida, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "aceptar"))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is C.vencida
    assert op.estado is E.cotizada


@pytest.mark.parametrize("origen", [C.borrador, C.aceptada, C.rechazada])
async def test_rf025_aceptar_invalida_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: C
) -> None:
    c = await cliente_como("empleado")
    _, cot = await _par(sesion, c.usuario.id, cot=origen, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "aceptar"))

    assert r.status_code == 409
    await sesion.refresh(cot)
    assert cot.estado is origen


async def test_aceptar_con_validez_vencida_409(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    ayer = hoy() - timedelta(days=1)
    op, cot = await _par(
        sesion,
        c.usuario.id,
        cot=C.enviada,
        op=E.cotizada,
        validez_hasta=ayer,  # type: ignore[attr-defined]
    )

    r = await c.post(_url(cot, "aceptar"))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is C.enviada
    assert op.estado is E.cotizada


async def test_aceptar_con_validez_igual_a_hoy_200(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    _, cot = await _par(
        sesion,
        c.usuario.id,
        cot=C.enviada,
        op=E.cotizada,
        validez_hasta=hoy(),  # type: ignore[attr-defined]
    )

    r = await c.post(_url(cot, "aceptar"))

    assert r.status_code == 200
    await sesion.refresh(cot)
    assert cot.estado is C.aceptada


# ---------- rechazar (T4, RF-025) ----------


async def test_rf025_rechazar(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    op, cot = await _par(sesion, c.usuario.id, cot=C.enviada, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "rechazar"))

    assert r.status_code == 200
    assert r.json()["estado"] == "rechazada"
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is C.rechazada
    assert op.estado is E.cotizada  # el seguimiento continúa (CU-06 A3)


@pytest.mark.parametrize("origen", [C.borrador, C.aceptada, C.rechazada, C.vencida])
async def test_rf025_rechazar_invalida_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, origen: C
) -> None:
    c = await cliente_como("empleado")
    _, cot = await _par(sesion, c.usuario.id, cot=origen, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, "rechazar"))

    assert r.status_code == 409
    await sesion.refresh(cot)
    assert cot.estado is origen


# ---------- permisos y visibilidad (RF-151, DEC-0005, DEC-0008) ----------

_PASOS = [
    ("enviar", C.borrador, C.enviada),
    ("aceptar", C.enviada, C.aceptada),
    ("rechazar", C.enviada, C.rechazada),
]


@pytest.mark.parametrize(("accion", "inicial", "final"), _PASOS)
@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_admin_y_dueno_actuan_sobre_las_ajenas(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    rol: str,
    accion: str,
    inicial: C,
    final: C,
) -> None:
    c = await cliente_como(rol)
    otro = await cliente_como("empleado")
    _, cot = await _par(sesion, otro.usuario.id, cot=inicial, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, accion))

    assert r.status_code == 200
    await sesion.refresh(cot)
    assert cot.estado is final


@pytest.mark.parametrize(("accion", "inicial", "final"), _PASOS)
async def test_rf151_empleado_no_responsable_403(
    cliente_como: FabricaCliente, sesion: AsyncSession, accion: str, inicial: C, final: C
) -> None:
    c = await cliente_como("empleado")
    otro = await cliente_como("empleado")
    op, cot = await _par(sesion, otro.usuario.id, cot=inicial, op=E.en_gestion)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, accion))

    assert r.status_code == 403
    await sesion.refresh(cot)
    await sesion.refresh(op)
    assert cot.estado is inicial
    assert op.estado is E.en_gestion


@pytest.mark.parametrize(("accion", "inicial", "final"), _PASOS)
async def test_rf151_freelance_ajena_404(
    cliente_como: FabricaCliente, sesion: AsyncSession, accion: str, inicial: C, final: C
) -> None:
    c = await cliente_como("freelance")
    otro = await cliente_como("empleado")
    _, cot = await _par(sesion, otro.usuario.id, cot=inicial, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, accion))

    assert r.status_code == 404  # se responde como si no existiera
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(cot)
    assert cot.estado is inicial


@pytest.mark.parametrize(("accion", "inicial", "final"), _PASOS)
async def test_rf151_freelance_propia_200(
    cliente_como: FabricaCliente, sesion: AsyncSession, accion: str, inicial: C, final: C
) -> None:
    c = await cliente_como("freelance")
    _, cot = await _par(sesion, c.usuario.id, cot=inicial, op=E.cotizada)  # type: ignore[attr-defined]

    r = await c.post(_url(cot, accion))

    assert r.status_code == 200
    await sesion.refresh(cot)
    assert cot.estado is final


@pytest.mark.parametrize("accion", ["enviar", "aceptar", "rechazar"])
async def test_rf025_cotizacion_inexistente_404(cliente_como: FabricaCliente, accion: str) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_url(uuid4(), accion))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("accion", ["enviar", "aceptar", "rechazar"])
async def test_rf025_sin_sesion_401(cliente_sin_sesion: AsyncClient, accion: str) -> None:
    r = await cliente_sin_sesion.post(_url(uuid4(), accion))

    assert r.status_code == 401
