"""T-064: dos transiciones simultáneas sobre la misma oportunidad no pueden ganar las dos.

Usa conexiones separadas con commit real (el resto de los tests corre en una transacción que se
revierte), así que borra al final lo que crea. Determinista: la segunda transición espera, ya
bloqueada en la base, a que la primera confirme.
"""

import asyncio
import uuid
from collections.abc import Awaitable
from datetime import timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import (
    Cotizacion,
    EstadoCotizacion,
    EstadoOportunidad,
    MotivoPerdida,
    Oportunidad,
    RolUsuario,
    Usuario,
)
from rumbo.negocio.errores import TransicionInvalida
from rumbo.negocio.servicios import oportunidades
from tests.fabricas import (
    ClienteFactory,
    CotizacionFactory,
    OportunidadFactory,
    UsuarioFactory,
    crear,
)


async def _hay_alguien_bloqueado(motor: AsyncEngine) -> bool:
    async with motor.connect() as conexion:
        n = await conexion.scalar(
            text("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock'")
        )
    return bool(n)


async def test_rf017_perder_y_ganar_en_paralelo_una_sola_gana(motor: AsyncEngine) -> None:
    async with AsyncSession(motor, expire_on_commit=False) as preparacion:
        usuario = await crear(preparacion, UsuarioFactory, rol=RolUsuario.admin)
        cliente = await crear(preparacion, ClienteFactory)
        op = await crear(
            preparacion,
            OportunidadFactory,
            cliente_id=cliente.id,
            responsable_id=usuario.id,
            estado=EstadoOportunidad.en_gestion,
        )
        await preparacion.commit()
    ids = (usuario.id, cliente.id, op.id)

    try:
        async with (
            AsyncSession(motor, expire_on_commit=False) as primera,
            AsyncSession(motor, expire_on_commit=False) as segunda,
        ):
            actor_1 = await primera.get(Usuario, usuario.id)
            actor_2 = await segunda.get(Usuario, usuario.id)
            assert actor_1 is not None
            assert actor_2 is not None

            # la primera transición queda abierta (sin commit), con la fila tomada
            await oportunidades.perder_oportunidad(
                primera, actor_1, op.id, MotivoPerdida.precio, None
            )

            # la segunda arranca mientras la primera sigue abierta
            ganar = asyncio.create_task(oportunidades.ganar_oportunidad(segunda, actor_2, op.id))
            for _ in range(100):
                if await _hay_alguien_bloqueado(motor) or ganar.done():
                    break
                await asyncio.sleep(0.05)
            await primera.commit()

            resultado = (await asyncio.gather(ganar, return_exceptions=True))[0]
            if not isinstance(resultado, BaseException):
                await segunda.commit()

        # exactamente una gana: la segunda ve la oportunidad ya perdida y da 409
        assert isinstance(resultado, TransicionInvalida), (
            "la segunda transición no dio 409 (sin bloqueo de fila revienta o pisa a la primera)"
        )
        async with AsyncSession(motor) as lectura:
            final = await lectura.get(Oportunidad, op.id)
            assert final is not None
            assert final.estado is EstadoOportunidad.perdida
            assert final.motivo_perdida is MotivoPerdida.precio
    finally:
        async with motor.begin() as conexion:
            await conexion.execute(text("DELETE FROM oportunidad WHERE id = :i"), {"i": ids[2]})
            await conexion.execute(text("DELETE FROM cliente WHERE id = :i"), {"i": ids[1]})
            await conexion.execute(text("DELETE FROM usuario WHERE id = :i"), {"i": ids[0]})


async def test_rf025_dos_sesiones_aceptan_versiones_distintas_una_sola_queda_aceptada(
    motor: AsyncEngine,
) -> None:
    """DEC-0028 1.2: se acepta cualquier versión, pero una sola por oportunidad. La sesión 1 gana
    con V1 (con la oportunidad bloqueada, sin commit); la sesión 2 acepta V2 y espera el bloqueo.
    Al confirmar la 1, la 2 da 409 y queda exactamente una aceptada."""
    async with AsyncSession(motor, expire_on_commit=False) as preparacion:
        usuario = await crear(preparacion, UsuarioFactory, rol=RolUsuario.admin)
        cliente = await crear(preparacion, ClienteFactory)
        op = await crear(
            preparacion,
            OportunidadFactory,
            cliente_id=cliente.id,
            responsable_id=usuario.id,
            estado=EstadoOportunidad.cotizada,
        )
        v1 = await crear(
            preparacion,
            CotizacionFactory,
            oportunidad_id=op.id,
            estado=EstadoCotizacion.enviada,
            validez_hasta=hoy() + timedelta(days=30),
        )
        v2 = await crear(
            preparacion,
            CotizacionFactory,
            oportunidad_id=op.id,
            estado=EstadoCotizacion.enviada,
            validez_hasta=hoy() + timedelta(days=30),
        )
        await preparacion.commit()
    ids = (usuario.id, cliente.id, op.id)

    try:
        async with (
            AsyncSession(motor, expire_on_commit=False) as primera,
            AsyncSession(motor, expire_on_commit=False) as segunda,
        ):
            actor_1 = await primera.get(Usuario, usuario.id)
            actor_2 = await segunda.get(Usuario, usuario.id)
            assert actor_1 is not None
            assert actor_2 is not None

            # la sesión 1 gana con V1 y queda abierta, con la oportunidad bloqueada
            await oportunidades.ganar_oportunidad(primera, actor_1, op.id, v1.id)

            # la sesión 2 acepta V2 (para ella, todavía sin aceptada) y espera el bloqueo
            aceptar = asyncio.create_task(oportunidades.aceptar_cotizacion(segunda, actor_2, v2.id))
            for _ in range(100):
                if await _hay_alguien_bloqueado(motor) or aceptar.done():
                    break
                await asyncio.sleep(0.05)
            await primera.commit()

            resultado = (await asyncio.gather(aceptar, return_exceptions=True))[0]
            if not isinstance(resultado, BaseException):
                await segunda.commit()

        assert isinstance(resultado, TransicionInvalida), (
            "la segunda aceptación no dio 409: quedaron dos aceptadas en la oportunidad"
        )
        async with AsyncSession(motor) as lectura:
            final_1 = await lectura.get(Cotizacion, v1.id)
            final_2 = await lectura.get(Cotizacion, v2.id)
            assert final_1 is not None
            assert final_2 is not None
            assert final_1.estado is EstadoCotizacion.aceptada
            assert final_2.estado is EstadoCotizacion.rechazada  # la rechazó el ganar de la 1
    finally:
        async with motor.begin() as conexion:
            await conexion.execute(
                text("DELETE FROM cotizacion WHERE oportunidad_id = :i"), {"i": ids[2]}
            )
            await conexion.execute(text("DELETE FROM oportunidad WHERE id = :i"), {"i": ids[2]})
            await conexion.execute(text("DELETE FROM cliente WHERE id = :i"), {"i": ids[1]})
            await conexion.execute(text("DELETE FROM usuario WHERE id = :i"), {"i": ids[0]})


async def test_rf016_ganar_y_vencer_en_paralelo_no_se_traban_con_orden_de_fecha_inverso_al_id(
    motor: AsyncEngine,
) -> None:
    """H-01 (review M11), DEC-0028 1.5: ganar con una cotización y el vencimiento diario toman los
    bloqueos de las cotizaciones en el mismo orden (id ascendente), aunque el historial las ordene
    al revés. Oportunidad con dos `enviada` vencidas, A (id menor, fecha anterior) y B (id mayor,
    fecha posterior), y un borrador vigente C, el más reciente, que es el que se elige.

    El intercalado se fuerza: el proceso diario toma a mano A; ganar arranca y se frena en el
    primer bloqueo que no consigue; recién entonces el diario sigue con el vencimiento. Con el
    orden del historial, ganar ya tiene B y el diario espera B mientras ganar espera A: bloqueo
    mutuo. Con el mismo orden, ganar espera A sin tener nada y las dos terminan."""
    a_id, b_id = sorted([uuid.uuid4(), uuid.uuid4()])
    c_id = uuid.uuid4()
    async with AsyncSession(motor, expire_on_commit=False) as preparacion:
        usuario = await crear(preparacion, UsuarioFactory, rol=RolUsuario.admin)
        cliente = await crear(preparacion, ClienteFactory)
        op = await crear(
            preparacion,
            OportunidadFactory,
            cliente_id=cliente.id,
            responsable_id=usuario.id,
            estado=EstadoOportunidad.cotizada,
        )
        vencida = hoy() - timedelta(days=10)
        for id_, fecha, estado in (
            (a_id, hoy() - timedelta(days=40), EstadoCotizacion.enviada),
            (b_id, hoy() - timedelta(days=30), EstadoCotizacion.enviada),
            (c_id, hoy(), EstadoCotizacion.borrador),
        ):
            await crear(
                preparacion,
                CotizacionFactory,
                id=id_,
                oportunidad_id=op.id,
                estado=estado,
                fecha=fecha,
                validez_hasta=vencida
                if estado is EstadoCotizacion.enviada
                else hoy() + timedelta(days=30),
            )
        await preparacion.commit()
    ids = (usuario.id, cliente.id, op.id)

    async def _terminar(sesion: AsyncSession, trabajo: Awaitable[object]) -> None:
        try:
            await trabajo
            await sesion.commit()
        except BaseException:
            await sesion.rollback()
            raise

    try:
        async with (
            AsyncSession(motor, expire_on_commit=False) as diario,
            AsyncSession(motor, expire_on_commit=False) as ganar,
        ):
            actor = await ganar.get(Usuario, usuario.id)
            assert actor is not None

            # el diario ya tiene tomada A (la primera por id), sin commit
            await diario.execute(
                text("SELECT id FROM cotizacion WHERE id = :i FOR UPDATE"), {"i": a_id}
            )

            ganando = asyncio.create_task(
                _terminar(ganar, oportunidades.ganar_oportunidad(ganar, actor, op.id, c_id))
            )
            for _ in range(100):
                if await _hay_alguien_bloqueado(motor) or ganando.done():
                    break
                await asyncio.sleep(0.05)

            venciendo = asyncio.create_task(
                _terminar(diario, oportunidades.vencer_cotizaciones(diario, hoy()))
            )
            resultados = await asyncio.wait_for(
                asyncio.gather(ganando, venciendo, return_exceptions=True), timeout=30
            )

        errores = [r for r in resultados if isinstance(r, BaseException)]
        assert not errores, (
            f"ganar y vencer se trabaron o fallaron (bloqueo mutuo por orden distinto): {errores!r}"
        )
        async with AsyncSession(motor) as lectura:
            final_op = await lectura.get(Oportunidad, op.id)
            elegida = await lectura.get(Cotizacion, c_id)
            otras = [await lectura.get(Cotizacion, i) for i in (a_id, b_id)]
            assert final_op is not None
            assert elegida is not None
            assert final_op.estado is EstadoOportunidad.ganada
            assert elegida.estado is EstadoCotizacion.aceptada
            assert all(
                o is not None and o.estado in (EstadoCotizacion.rechazada, EstadoCotizacion.vencida)
                for o in otras
            )
    finally:
        async with motor.begin() as conexion:
            await conexion.execute(
                text("DELETE FROM cotizacion WHERE oportunidad_id = :i"), {"i": ids[2]}
            )
            await conexion.execute(
                text("DELETE FROM alerta WHERE oportunidad_id = :i"), {"i": ids[2]}
            )
            await conexion.execute(text("DELETE FROM oportunidad WHERE id = :i"), {"i": ids[2]})
            await conexion.execute(text("DELETE FROM cliente WHERE id = :i"), {"i": ids[1]})
            await conexion.execute(text("DELETE FROM usuario WHERE id = :i"), {"i": ids[0]})
