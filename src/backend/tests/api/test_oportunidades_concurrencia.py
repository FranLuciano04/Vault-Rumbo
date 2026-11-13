"""T-064: dos transiciones simultáneas sobre la misma oportunidad no pueden ganar las dos.

Usa conexiones separadas con commit real (el resto de los tests corre en una transacción que se
revierte), así que borra al final lo que crea. Determinista: la segunda transición espera, ya
bloqueada en la base, a que la primera confirme.
"""

import asyncio
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
