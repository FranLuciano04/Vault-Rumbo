"""Fix M7 H-01 (sin ticket, DEC-0019): el proceso diario no puede dejar una sugerencia pendiente
que una operación de la API invalidó entre la selección de candidatos y la inserción de las
alertas (CU-30 A1/A2, RF-029, RF-030; CU-08, RF-039, EST-Viaje T6).

Dos transacciones reales (commit de verdad, como `test_oportunidades_concurrencia.py`; el resto
corre en una transacción que se revierte), así que cada test borra al final lo que crea.
El proceso se pausa justo después de elegir candidatos; la operación de la API corre en otra
conexión mientras tanto. Los tests no suponen cómo se resuelve: si la API queda esperando un
bloqueo del proceso, se la espera un rato y después se deja seguir al proceso; si no, la API
confirma antes de que el proceso inserte. En los dos casos, al final no tiene que quedar una
alerta pendiente que ya no corresponde.
"""

import asyncio
import uuid
from datetime import date

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.core.db import crear_fabrica_sesiones
from rumbo.datos import modelos as m
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.viajes import RepositorioViajes
from rumbo.negocio.servicios import clientes, oportunidades, proceso_diario, viajes
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

HOY = date(2026, 11, 2)
VIEJO = date(2026, 1, 15)
ESPERA_DE_LA_API = 3.0  # segundos que se le da a la API antes de dejar seguir al proceso
LIMITE = 30.0


class _Pausa:
    def __init__(self) -> None:
        self.seleccionado = asyncio.Event()
        self.continuar = asyncio.Event()


def _pausar_tras_seleccionar(
    monkeypatch: pytest.MonkeyPatch, repositorio: type, metodo: str
) -> _Pausa:
    """Hace que la primera llamada a `repositorio.metodo` avise que ya eligió y espere."""
    pausa = _Pausa()
    original = getattr(repositorio, metodo)

    async def _con_pausa(self: object, *args: object, **kwargs: object) -> object:
        resultado = await original(self, *args, **kwargs)
        if not pausa.seleccionado.is_set():
            pausa.seleccionado.set()
            await pausa.continuar.wait()
        return resultado

    monkeypatch.setattr(repositorio, metodo, _con_pausa)
    return pausa


def _paso(palabra: str) -> proceso_diario.Paso:
    pasos = [p for p in proceso_diario.PASOS if palabra in p.nombre.lower()]
    assert len(pasos) == 1, f"el paso de «{palabra}» tiene que estar registrado en PASOS"
    return pasos[0]


async def _correr_con_la_api_en_el_medio(
    motor: AsyncEngine, pausa: _Pausa, paso: proceso_diario.Paso, operacion: object
) -> None:
    """Corre `paso`; cuando eligió candidatos, lanza `operacion` (una corrutina que usa su propia
    sesión) y la espera; después deja seguir al proceso. Falla si el proceso o la API fallan."""
    fabrica = crear_fabrica_sesiones(motor)
    proceso = asyncio.create_task(proceso_diario.correr(fabrica, HOY, [paso]))
    await asyncio.wait_for(pausa.seleccionado.wait(), LIMITE)
    api = asyncio.create_task(operacion)  # type: ignore[arg-type]
    await asyncio.wait({api}, timeout=ESPERA_DE_LA_API)
    pausa.continuar.set()
    resultados, _ = await asyncio.wait_for(asyncio.gather(proceso, api), LIMITE)
    assert all(r.ok for r in resultados), f"el proceso diario falló: {resultados}"


async def _borrar(motor: AsyncEngine, **ids: uuid.UUID | None) -> None:
    async with motor.begin() as conexion:
        for tabla, columna, clave in (
            ("alerta", "cliente_id", "cliente"),
            ("alerta", "viaje_id", "viaje"),
            ("oportunidad", "cliente_id", "cliente"),
            ("viaje", "id", "viaje"),
            ("destino", "id", "destino"),
            ("cliente", "id", "cliente"),
            ("usuario", "id", "usuario"),
        ):
            if ids.get(clave) is not None:
                await conexion.execute(
                    text(f"DELETE FROM {tabla} WHERE {columna} = :i"),  # noqa: S608
                    {"i": ids[clave]},
                )


async def _pendientes(
    motor: AsyncEngine, tipo: m.TipoAlerta, **donde: uuid.UUID
) -> list[m.Alerta]:
    async with AsyncSession(motor) as lectura:
        consulta = select(m.Alerta).where(
            m.Alerta.tipo == tipo,
            m.Alerta.estado.in_((m.EstadoAlerta.pendiente, m.EstadoAlerta.vista)),
            *(getattr(m.Alerta, columna) == valor for columna, valor in donde.items()),
        )
        return list(await lectura.scalars(consulta))


async def _preparar_cliente_inactivo(motor: AsyncEngine) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    """Un admin activo, un cliente suyo con un viaje viejo y su destino (ids, ya confirmados)."""
    async with AsyncSession(motor, expire_on_commit=False) as s:
        admin = await crear(s, UsuarioFactory, rol=m.RolUsuario.admin, activo=True)
        cliente = await crear(s, ClienteFactory, asesor_asignado_id=admin.id)
        destino = await crear(s, DestinoFactory)
        await crear(
            s,
            ViajeFactory,
            cliente_id=cliente.id,
            destino_id=destino.id,
            responsable_id=admin.id,
            fecha_salida=date(2026, 1, 1),
            fecha_regreso=VIEJO,
        )
        await s.commit()
    return admin.id, cliente.id, destino.id


async def _borrar_viajes_de(motor: AsyncEngine, cliente_id: uuid.UUID) -> None:
    async with motor.begin() as conexion:
        await conexion.execute(text("DELETE FROM viaje WHERE cliente_id = :i"), {"i": cliente_id})


async def test_rf030_el_opt_out_confirmado_en_el_medio_no_deja_sugerencia_pendiente(
    motor: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin_id, cliente_id, destino_id = await _preparar_cliente_inactivo(motor)
    pausa = _pausar_tras_seleccionar(monkeypatch, RepositorioClientes, "inactivos_para_recontacto")

    async def marcar_no_recontactar() -> None:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            actor = await s.get(m.Usuario, admin_id)
            assert actor is not None
            await clientes.editar_cliente(s, actor, cliente_id, {"no_recontactar": True})
            await s.commit()

    try:
        await _correr_con_la_api_en_el_medio(
            motor, pausa, _paso("recontacto"), marcar_no_recontactar()
        )

        assert await _pendientes(motor, m.TipoAlerta.recontacto, cliente_id=cliente_id) == [], (
            "el cliente quedó con una sugerencia de recontacto pendiente aunque confirmaron "
            "no_recontactar antes de que el proceso la insertara"
        )
    finally:
        await _borrar_viajes_de(motor, cliente_id)
        await _borrar(motor, cliente=cliente_id, destino=destino_id, usuario=admin_id)


async def test_rf029_la_consulta_registrada_en_el_medio_no_deja_sugerencia_pendiente(
    motor: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin_id, cliente_id, destino_id = await _preparar_cliente_inactivo(motor)
    pausa = _pausar_tras_seleccionar(monkeypatch, RepositorioClientes, "inactivos_para_recontacto")

    async def registrar_consulta() -> None:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            actor = await s.get(m.Usuario, admin_id)
            assert actor is not None
            await oportunidades.registrar_consulta(
                s,
                actor,
                {
                    "cliente_id": cliente_id,
                    "canal": m.CanalOportunidad.whatsapp,
                    "destino_consultado": "Bariloche",
                    "pasajeros": 2,
                },
            )
            await s.commit()

    try:
        await _correr_con_la_api_en_el_medio(
            motor, pausa, _paso("recontacto"), registrar_consulta()
        )

        assert await _pendientes(motor, m.TipoAlerta.recontacto, cliente_id=cliente_id) == [], (
            "el cliente quedó con una sugerencia de recontacto pendiente aunque registraron "
            "una consulta antes de que el proceso la insertara"
        )
    finally:
        await _borrar_viajes_de(motor, cliente_id)
        await _borrar(motor, cliente=cliente_id, destino=destino_id, usuario=admin_id)


async def test_rf039_la_cancelacion_del_viaje_en_el_medio_no_deja_sugerencia_pendiente(
    motor: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    async with AsyncSession(motor, expire_on_commit=False) as s:
        admin = await crear(s, UsuarioFactory, rol=m.RolUsuario.admin, activo=True)
        cliente = await crear(s, ClienteFactory, asesor_asignado_id=admin.id)
        destino = await crear(s, DestinoFactory)
        viaje = await crear(
            s,
            ViajeFactory,
            cliente_id=cliente.id,
            destino_id=destino.id,
            responsable_id=admin.id,
            estado=m.EstadoViaje.confirmado,
            fecha_salida=HOY,
            fecha_regreso=date(2026, 11, 12),
        )
        await s.commit()
    pausa = _pausar_tras_seleccionar(monkeypatch, RepositorioViajes, "para_sugerir_avance")

    async def cancelar_el_viaje() -> None:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            actor = await s.get(m.Usuario, admin.id)
            assert actor is not None
            await viajes.cancelar(s, actor, viaje.id, "Cambio de planes", HOY)
            await s.commit()

    try:
        await _correr_con_la_api_en_el_medio(motor, pausa, _paso("viaje"), cancelar_el_viaje())

        assert await _pendientes(motor, m.TipoAlerta.viaje, viaje_id=viaje.id) == [], (
            "el viaje cancelado quedó con una sugerencia de avance pendiente que el proceso "
            "insertó después de la cancelación"
        )
    finally:
        await _borrar(
            motor, viaje=viaje.id, cliente=cliente.id, destino=destino.id, usuario=admin.id
        )
