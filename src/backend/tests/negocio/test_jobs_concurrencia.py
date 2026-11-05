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

Los tests de orden inverso arrancan al revés: la API bloquea primero, el proceso queda esperando
y la API confirma. Ahí lo que protege es que el proceso relea después de bloquear: la sentencia
que espera conserva su foto de la base y no ve, por ejemplo, la `Oportunidad` recién confirmada.

Cada test comprueba antes que su cliente o viaje es candidato: si no, pasaría en vacío.
"""

import asyncio
import uuid
from collections.abc import Coroutine
from datetime import date

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.core.db import crear_fabrica_sesiones
from rumbo.core.fechas import sumar_meses
from rumbo.datos import modelos as m
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.viajes import RepositorioViajes
from rumbo.negocio.servicios import clientes, oportunidades, parametros, proceso_diario, viajes
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
    motor: AsyncEngine,
    pausa: _Pausa,
    paso: proceso_diario.Paso,
    operacion: Coroutine[object, object, None],
) -> None:
    """Corre `paso`; cuando eligió candidatos, lanza `operacion` (una corrutina que usa su propia
    sesión) y la espera; después deja seguir al proceso. Falla si el proceso o la API fallan."""
    fabrica = crear_fabrica_sesiones(motor)
    proceso = asyncio.create_task(proceso_diario.correr(fabrica, HOY, [paso]))
    await asyncio.wait_for(pausa.seleccionado.wait(), LIMITE)
    api = asyncio.create_task(operacion)
    await asyncio.wait({api}, timeout=ESPERA_DE_LA_API)
    pausa.continuar.set()
    resultados, _ = await asyncio.wait_for(asyncio.gather(proceso, api), LIMITE)
    assert all(r.ok for r in resultados), f"el proceso diario falló: {resultados}"


async def _esperar_al_proceso_bloqueado(motor: AsyncEngine, proceso: asyncio.Task[object]) -> None:
    """Vuelve cuando el proceso quedó esperando un bloqueo de fila; si termina antes o no llega a
    esperar, falla. `pg_stat_activity` mira toda la base: cada worker de xdist tiene la suya."""
    consulta = text(
        "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() "
        "AND wait_event_type = 'Lock' AND wait_event IN ('transactionid', 'tuple')"
    )
    for _ in range(int(LIMITE / 0.05)):
        assert not proceso.done(), "el proceso terminó sin esperar el bloqueo de la API"
        async with motor.connect() as conexion:
            if await conexion.scalar(consulta):
                return
        await asyncio.sleep(0.05)
    pytest.fail("el proceso no quedó esperando el bloqueo de la API")


async def _correr_con_la_api_por_delante(
    motor: AsyncEngine, paso: proceso_diario.Paso, api: AsyncSession
) -> None:
    """Corre `paso` mientras `api` tiene su operación hecha y sin confirmar; cuando el proceso
    quedó esperando, la confirma. Falla si el proceso no espera o si falla."""
    fabrica = crear_fabrica_sesiones(motor)
    proceso = asyncio.create_task(proceso_diario.correr(fabrica, HOY, [paso]))
    try:
        await _esperar_al_proceso_bloqueado(motor, proceso)
    finally:  # aunque falle, el proceso termina antes de que el test borre lo que creó
        await api.commit()
        resultados = await asyncio.wait_for(proceso, LIMITE)
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


async def _pendientes(motor: AsyncEngine, tipo: m.TipoAlerta, **donde: uuid.UUID) -> list[m.Alerta]:
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


async def _preparar_viaje_confirmado(
    motor: AsyncEngine,
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    """Un admin activo, su cliente, un destino y un viaje confirmado que sale hoy (ids, ya
    confirmados)."""
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
    return admin.id, cliente.id, destino.id, viaje.id


async def _exigir_candidato_a_recontacto(motor: AsyncEngine, cliente_id: uuid.UUID) -> None:
    """Control: sin la operación de la API, el proceso elige a este cliente. Va antes de pausar
    el repositorio; la sesión se revierte y suelta los bloqueos."""
    async with AsyncSession(motor) as s:
        meses = (await parametros.obtener(s)).recontacto_meses
        candidatos = await RepositorioClientes().inactivos_para_recontacto(
            s, regreso_hasta=sumar_meses(HOY, -meses)
        )
    assert cliente_id in {c.cliente.id for c in candidatos}, "el cliente no era candidato"


async def _exigir_candidato_a_avance(motor: AsyncEngine, viaje_id: uuid.UUID) -> None:
    """Control: sin la operación de la API, el proceso elige a este viaje. Va antes de pausar el
    repositorio; la sesión se revierte y suelta los bloqueos."""
    async with AsyncSession(motor) as s:
        candidatos = await RepositorioViajes().para_sugerir_avance(
            s, estado=m.EstadoViaje.confirmado, hasta=HOY, sugerencia="en curso"
        )
    assert viaje_id in {c.viaje.id for c in candidatos}, "el viaje no era candidato"


async def _marcar_no_recontactar(
    s: AsyncSession, admin_id: uuid.UUID, cliente_id: uuid.UUID
) -> None:
    actor = await s.get(m.Usuario, admin_id)
    assert actor is not None
    await clientes.editar_cliente(s, actor, cliente_id, {"no_recontactar": True})


async def _registrar_consulta(s: AsyncSession, admin_id: uuid.UUID, cliente_id: uuid.UUID) -> None:
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


async def _cancelar_viaje(s: AsyncSession, admin_id: uuid.UUID, viaje_id: uuid.UUID) -> None:
    actor = await s.get(m.Usuario, admin_id)
    assert actor is not None
    await viajes.cancelar(s, actor, viaje_id, "Cambio de planes", HOY)


async def _borrar_viajes_de(motor: AsyncEngine, cliente_id: uuid.UUID) -> None:
    async with motor.begin() as conexion:
        await conexion.execute(text("DELETE FROM viaje WHERE cliente_id = :i"), {"i": cliente_id})


async def test_rf030_el_opt_out_confirmado_en_el_medio_no_deja_sugerencia_pendiente(
    motor: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin_id, cliente_id, destino_id = await _preparar_cliente_inactivo(motor)
    await _exigir_candidato_a_recontacto(motor, cliente_id)
    pausa = _pausar_tras_seleccionar(monkeypatch, RepositorioClientes, "inactivos_para_recontacto")

    async def marcar_no_recontactar() -> None:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            await _marcar_no_recontactar(s, admin_id, cliente_id)
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
    await _exigir_candidato_a_recontacto(motor, cliente_id)
    pausa = _pausar_tras_seleccionar(monkeypatch, RepositorioClientes, "inactivos_para_recontacto")

    async def registrar_consulta() -> None:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            await _registrar_consulta(s, admin_id, cliente_id)
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
    admin_id, cliente_id, destino_id, viaje_id = await _preparar_viaje_confirmado(motor)
    await _exigir_candidato_a_avance(motor, viaje_id)
    pausa = _pausar_tras_seleccionar(monkeypatch, RepositorioViajes, "para_sugerir_avance")

    async def cancelar_el_viaje() -> None:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            await _cancelar_viaje(s, admin_id, viaje_id)
            await s.commit()

    try:
        await _correr_con_la_api_en_el_medio(motor, pausa, _paso("viaje"), cancelar_el_viaje())

        assert await _pendientes(motor, m.TipoAlerta.viaje, viaje_id=viaje_id) == [], (
            "el viaje cancelado quedó con una sugerencia de avance pendiente que el proceso "
            "insertó después de la cancelación"
        )
    finally:
        await _borrar(
            motor, viaje=viaje_id, cliente=cliente_id, destino=destino_id, usuario=admin_id
        )


async def test_rf029_la_consulta_sin_confirmar_hace_esperar_al_proceso_y_no_queda_sugerencia(
    motor: AsyncEngine,
) -> None:
    admin_id, cliente_id, destino_id = await _preparar_cliente_inactivo(motor)
    await _exigir_candidato_a_recontacto(motor, cliente_id)

    try:
        async with AsyncSession(motor, expire_on_commit=False) as api:
            await _registrar_consulta(api, admin_id, cliente_id)
            await _correr_con_la_api_por_delante(motor, _paso("recontacto"), api)

        assert await _pendientes(motor, m.TipoAlerta.recontacto, cliente_id=cliente_id) == [], (
            "el proceso insertó la sugerencia con la lectura de antes de esperar: no vio la "
            "oportunidad que la API confirmó mientras él esperaba el bloqueo"
        )
    finally:
        await _borrar_viajes_de(motor, cliente_id)
        await _borrar(motor, cliente=cliente_id, destino=destino_id, usuario=admin_id)


async def test_rf030_el_opt_out_sin_confirmar_hace_esperar_al_proceso_y_no_queda_sugerencia(
    motor: AsyncEngine,
) -> None:
    admin_id, cliente_id, destino_id = await _preparar_cliente_inactivo(motor)
    await _exigir_candidato_a_recontacto(motor, cliente_id)

    try:
        async with AsyncSession(motor, expire_on_commit=False) as api:
            await _marcar_no_recontactar(api, admin_id, cliente_id)
            await _correr_con_la_api_por_delante(motor, _paso("recontacto"), api)

        assert await _pendientes(motor, m.TipoAlerta.recontacto, cliente_id=cliente_id) == [], (
            "el proceso insertó la sugerencia aunque la API confirmó no_recontactar mientras él "
            "esperaba el bloqueo"
        )
    finally:
        await _borrar_viajes_de(motor, cliente_id)
        await _borrar(motor, cliente=cliente_id, destino=destino_id, usuario=admin_id)


async def test_rf039_la_cancelacion_sin_confirmar_hace_esperar_al_proceso_y_no_queda_sugerencia(
    motor: AsyncEngine,
) -> None:
    admin_id, cliente_id, destino_id, viaje_id = await _preparar_viaje_confirmado(motor)
    await _exigir_candidato_a_avance(motor, viaje_id)

    try:
        async with AsyncSession(motor, expire_on_commit=False) as api:
            await _cancelar_viaje(api, admin_id, viaje_id)
            await _correr_con_la_api_por_delante(motor, _paso("viaje"), api)

        assert await _pendientes(motor, m.TipoAlerta.viaje, viaje_id=viaje_id) == [], (
            "el proceso insertó la sugerencia aunque la API canceló el viaje mientras él "
            "esperaba el bloqueo"
        )
    finally:
        await _borrar(
            motor, viaje=viaje_id, cliente=cliente_id, destino=destino_id, usuario=admin_id
        )
