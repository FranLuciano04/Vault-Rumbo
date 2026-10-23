"""T-155: resumen por fila del listado de clientes (CU-03 paso 1; RF-005, RF-006, RF-151).

Contrato asumido: cada ítem de `GET /api/clientes` suma `asesor` (`{id, nombre}` o `null`),
`ultimo_viaje` (`{fecha_salida, destino}` o `null`; `destino` es el nombre del `Destino`) y
`oportunidades_abiertas` (int: estados `nueva`, `en_gestion`, `cotizada`). El último viaje es el de
mayor `fecha_salida` entre los no cancelados.
"""

from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any

from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession

from rumbo.datos.modelos import Cliente, EstadoOportunidad, EstadoViaje, MotivoPerdida
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    OportunidadFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


def _item(r: Any, cliente: Cliente) -> dict[str, Any]:
    assert r.status_code == 200, r.text
    return next(i for i in r.json()["items"] if i["id"] == str(cliente.id))


async def _viaje(
    sesion: AsyncSession, cliente: Cliente, responsable: Any, destino: Any, **campos: Any
) -> Any:
    return await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        responsable_id=responsable.id,
        destino_id=destino.id,
        **campos,
    )


async def _cancelado(
    sesion: AsyncSession, cliente: Cliente, responsable: Any, destino: Any, **campos: Any
) -> Any:
    return await _viaje(
        sesion,
        cliente,
        responsable,
        destino,
        estado=EstadoViaje("cancelado"),
        estado_previo=EstadoViaje("reservado"),
        motivo_cancelacion="Desistió",
        fecha_cancelacion=date(2026, 10, 1),
        **campos,
    )


async def _oportunidad(
    sesion: AsyncSession, cliente: Cliente, responsable: Any, estado: str, **campos: Any
) -> Any:
    return await crear(
        sesion,
        OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable.id,
        estado=EstadoOportunidad(estado),
        **campos,
    )


async def test_rf005_listado_trae_asesor_ultimo_viaje_y_oportunidades(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    asesor = await crear(sesion, UsuarioFactory, nombre="Laura Asesora")
    cliente = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=asesor.id)
    viejo = await crear(sesion, DestinoFactory, nombre="Bariloche", pais="Argentina")
    nuevo = await crear(sesion, DestinoFactory, nombre="Salvador", pais="Brasil")
    await _viaje(
        sesion,
        cliente,
        asesor,
        viejo,
        fecha_salida=date(2026, 1, 10),
        fecha_regreso=date(2026, 1, 20),
    )
    await _viaje(
        sesion,
        cliente,
        asesor,
        nuevo,
        fecha_salida=date(2027, 3, 1),
        fecha_regreso=date(2027, 3, 9),
    )
    for estado in ("nueva", "en_gestion", "cotizada", "ganada"):
        await _oportunidad(sesion, cliente, asesor, estado)
    await _oportunidad(sesion, cliente, asesor, "perdida", motivo_perdida=MotivoPerdida("precio"))
    c = await cliente_como("dueno")

    item = _item(await c.get("/api/clientes"), cliente)

    assert item["asesor"] == {"id": str(asesor.id), "nombre": "Laura Asesora"}
    assert item["ultimo_viaje"] == {"fecha_salida": "2027-03-01", "destino": "Salvador"}
    assert item["oportunidades_abiertas"] == 3


async def test_rf005_cliente_sin_viajes_ni_oportunidades(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    cliente = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=None)
    c = await cliente_como("empleado")

    item = _item(await c.get("/api/clientes"), cliente)

    assert item["asesor"] is None
    assert item["ultimo_viaje"] is None
    assert item["oportunidades_abiertas"] == 0


async def test_rf005_ultimo_viaje_ignora_cancelados(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    asesor = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=asesor.id)
    vigente = await crear(sesion, DestinoFactory, nombre="Mendoza", pais="Argentina")
    cancelado = await crear(sesion, DestinoFactory, nombre="Cancún", pais="México")
    await _viaje(
        sesion,
        cliente,
        asesor,
        vigente,
        fecha_salida=date(2026, 5, 1),
        fecha_regreso=date(2026, 5, 8),
    )
    await _cancelado(
        sesion,
        cliente,
        asesor,
        cancelado,
        fecha_salida=date(2027, 8, 1),
        fecha_regreso=date(2027, 8, 8),
    )
    c = await cliente_como("admin")

    item = _item(await c.get("/api/clientes"), cliente)

    assert item["ultimo_viaje"] == {"fecha_salida": "2026-05-01", "destino": "Mendoza"}


async def test_rf005_cliente_con_solo_viajes_cancelados_no_tiene_ultimo_viaje(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    asesor = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=asesor.id)
    destino = await crear(sesion, DestinoFactory)
    await _cancelado(sesion, cliente, asesor, destino)
    c = await cliente_como("admin")

    item = _item(await c.get("/api/clientes"), cliente)

    assert item["ultimo_viaje"] is None


async def test_rf151_freelance_ve_el_resumen_completo_de_sus_clientes(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    # Regla (politicas.py): si el cliente es del freelance, cuentan todos sus viajes y
    # oportunidades, aunque el responsable sea otro usuario.
    c = await cliente_como("freelance")
    yo = c.usuario  # type: ignore[attr-defined]
    empleado = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, nombre="Ana", asesor_asignado_id=yo.id)
    propio = await crear(sesion, DestinoFactory, nombre="Ushuaia", pais="Argentina")
    ajeno = await crear(sesion, DestinoFactory, nombre="Lima", pais="Perú")
    await _viaje(
        sesion, cliente, yo, propio, fecha_salida=date(2026, 6, 1), fecha_regreso=date(2026, 6, 8)
    )
    await _viaje(
        sesion,
        cliente,
        empleado,
        ajeno,
        fecha_salida=date(2027, 6, 1),
        fecha_regreso=date(2027, 6, 8),
    )
    await _oportunidad(sesion, cliente, yo, "nueva")
    await _oportunidad(sesion, cliente, empleado, "en_gestion")
    await _oportunidad(sesion, cliente, empleado, "cotizada")

    item = _item(await c.get("/api/clientes"), cliente)

    assert item["ultimo_viaje"] == {"fecha_salida": "2027-06-01", "destino": "Lima"}
    assert item["oportunidades_abiertas"] == 3


async def test_rf151_freelance_cuenta_lo_del_cliente_aunque_nada_sea_suyo_por_responsable(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    empleado = await crear(sesion, UsuarioFactory)
    cliente = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana",
        asesor_asignado_id=c.usuario.id,  # type: ignore[attr-defined]
    )
    destino = await crear(sesion, DestinoFactory, nombre="Lima", pais="Perú")
    await _viaje(
        sesion,
        cliente,
        empleado,
        destino,
        fecha_salida=date(2027, 6, 1),
        fecha_regreso=date(2027, 6, 8),
    )
    await _oportunidad(sesion, cliente, empleado, "nueva")

    item = _item(await c.get("/api/clientes"), cliente)

    assert item["ultimo_viaje"] == {"fecha_salida": "2027-06-01", "destino": "Lima"}
    assert item["oportunidades_abiertas"] == 1


async def test_rf151_el_resumen_es_igual_para_el_freelance_y_para_la_agencia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    libre = await cliente_como("freelance")
    jefe = await cliente_como("dueno")
    empleado = await crear(sesion, UsuarioFactory)
    cliente = await crear(
        sesion,
        ClienteFactory,
        nombre="Ana",
        asesor_asignado_id=libre.usuario.id,  # type: ignore[attr-defined]
    )
    destino = await crear(sesion, DestinoFactory, nombre="Lima", pais="Perú")
    await _viaje(sesion, cliente, empleado, destino)
    await _oportunidad(sesion, cliente, empleado, "cotizada")

    para_libre = _item(await libre.get("/api/clientes"), cliente)
    para_jefe = _item(await jefe.get("/api/clientes"), cliente)

    assert para_libre["ultimo_viaje"] == para_jefe["ultimo_viaje"]
    assert para_libre["oportunidades_abiertas"] == para_jefe["oportunidades_abiertas"] == 1


async def _consultas_del_listado(sesion: AsyncSession, c: AsyncClient) -> int:
    conexion = sesion.bind
    assert isinstance(conexion, AsyncConnection)
    sentencias: list[str] = []

    def _contar(_conn: Any, _cur: Any, sentencia: str, *_resto: Any) -> None:
        sentencias.append(sentencia)

    motor = conexion.sync_engine
    event.listen(motor, "before_cursor_execute", _contar)
    try:
        r = await c.get("/api/clientes", params={"por_pagina": 50})
        assert r.status_code == 200, r.text
    finally:
        event.remove(motor, "before_cursor_execute", _contar)
    return len(sentencias)


async def _poblar(sesion: AsyncSession, cantidad: int, prefijo: str) -> None:
    asesor = await crear(sesion, UsuarioFactory)
    destino = await crear(sesion, DestinoFactory)
    for i in range(cantidad):
        cli = await crear(
            sesion, ClienteFactory, nombre=f"{prefijo} {i:02d}", asesor_asignado_id=asesor.id
        )
        await _viaje(sesion, cli, asesor, destino)
        await _oportunidad(sesion, cli, asesor, "nueva")


async def test_rf005_listado_sin_consultas_n_mas_1(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    await _poblar(sesion, 2, "Pocos")
    pocas = await _consultas_del_listado(sesion, c)
    await _poblar(sesion, 15, "Muchos")

    muchas = await _consultas_del_listado(sesion, c)

    assert muchas == pocas
