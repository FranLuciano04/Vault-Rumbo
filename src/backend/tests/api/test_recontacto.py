"""T-114: decidir sobre una sugerencia de recontacto (CU-30 A1, A2, A3; RF-029, RF-030).

Decisión del test-writer: el contrato no deja vincular la oportunidad con la alerta
(`POST /oportunidades` no recibe `alerta_id`). Se vincula por el cliente: la alerta
`recontacto` tiene como origen al `Cliente`, y al registrar una oportunidad para ese cliente
(o marcarlo `no_recontactar`) el sistema resuelve sus sugerencias sin resolver, sin cambiar
el contrato. Si el equipo prefiere un `alerta_id` explícito, es un cambio de contrato.
"""

from collections.abc import Awaitable, Callable
from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Alerta, Cliente, EstadoAlerta, TipoAlerta, Usuario
from rumbo.negocio.servicios import alertas as servicio
from tests.fabricas import ClienteFactory, crear

FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


async def _sugerencia(
    sesion: AsyncSession, yo: Usuario, cliente: Cliente, fecha=None  # type: ignore[no-untyped-def]
) -> Alerta:
    return await servicio.crear(
        sesion, TipoAlerta.recontacto, fecha or hoy(), "Recontactar", yo, cliente
    )


async def _estado(sesion: AsyncSession, alerta: Alerta) -> EstadoAlerta:
    await sesion.refresh(alerta)
    return alerta.estado


async def test_rf029_deriva_en_oportunidad(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo: Usuario = c.usuario  # type: ignore[attr-defined]
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    sugerencia = await _sugerencia(sesion, yo, cliente)

    r = await c.post(
        "/api/oportunidades",
        json={
            "cliente_id": str(cliente.id),
            "canal": "whatsapp",
            "destino_consultado": "Bariloche",
            "pasajeros": 2,
        },
    )

    assert r.status_code == 201, r.text
    assert await _estado(sesion, sugerencia) == EstadoAlerta.resuelta
    assert sugerencia.resuelta_en is not None


async def test_rf029_oportunidad_no_resuelve_sugerencia_de_otro_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo: Usuario = c.usuario  # type: ignore[attr-defined]
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    otro = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    ajena = await _sugerencia(sesion, yo, otro)

    r = await c.post(
        "/api/oportunidades",
        json={
            "cliente_id": str(cliente.id),
            "canal": "whatsapp",
            "destino_consultado": "Salta",
            "pasajeros": 1,
        },
    )

    assert r.status_code == 201, r.text
    assert await _estado(sesion, ajena) == EstadoAlerta.pendiente


async def test_rf030_opt_out(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo: Usuario = c.usuario  # type: ignore[attr-defined]
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    sugerencia = await _sugerencia(sesion, yo, cliente)

    r = await c.patch(f"/api/clientes/{cliente.id}", json={"no_recontactar": True})

    assert r.status_code == 200, r.text
    assert r.json()["no_recontactar"] is True
    assert await _estado(sesion, sugerencia) == EstadoAlerta.resuelta
    assert sugerencia.resuelta_en is not None


async def test_rf030_editar_otro_campo_no_resuelve_la_sugerencia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo: Usuario = c.usuario  # type: ignore[attr-defined]
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    sugerencia = await _sugerencia(sesion, yo, cliente)

    r = await c.patch(f"/api/clientes/{cliente.id}", json={"preferencias": "vuelo directo"})

    assert r.status_code == 200, r.text
    assert await _estado(sesion, sugerencia) == EstadoAlerta.pendiente


async def test_posponer(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo: Usuario = c.usuario  # type: ignore[attr-defined]
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    sugerencia = await _sugerencia(sesion, yo, cliente)
    nueva = hoy() + timedelta(days=7)

    r = await c.post(f"/api/alertas/{sugerencia.id}/posponer", json={"fecha": str(nueva)})

    assert r.status_code == 200, r.text
    assert r.json()["fecha"] == str(nueva)
    assert r.json()["estado"] == "pendiente"
    await sesion.refresh(sugerencia)
    assert sugerencia.fecha == nueva
