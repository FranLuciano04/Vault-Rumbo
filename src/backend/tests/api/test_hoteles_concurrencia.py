"""H-05 de la review de M5: la edición y la baja de un hotel con otra sesión en paralelo.

Usa conexiones separadas con commit real (el resto de los tests corre en una transacción que se
revierte), así que borra al final lo que crea. La intercalación se fuerza: la sesión A ya tiene
cargado el hotel (o lo lee antes de que B confirme) y B modifica y confirma antes del UPDATE de A.
"""

import asyncio
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.datos.modelos import EstadoHotel, Hotel, RolUsuario, Usuario
from rumbo.negocio.errores import Conflicto, HotelDuplicado
from rumbo.negocio.servicios import hoteles
from tests.fabricas import DestinoFactory, HotelFactory, UsuarioFactory, crear


@dataclass
class Escenario:
    usuario_id: uuid.UUID
    d1_id: uuid.UUID
    d2_id: uuid.UUID
    luna_id: uuid.UUID  # «Luna» en D1
    sol_id: uuid.UUID  # «Sol» en D2


async def _hay_alguien_bloqueado(motor: AsyncEngine) -> bool:
    async with motor.connect() as conexion:
        n = await conexion.scalar(
            text("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock'")
        )
    return bool(n)


async def _esperar_bloqueo(motor: AsyncEngine, tarea: asyncio.Task[object]) -> None:
    for _ in range(100):
        if await _hay_alguien_bloqueado(motor) or tarea.done():
            return
        await asyncio.sleep(0.05)


@asynccontextmanager
async def _escenario(motor: AsyncEngine) -> AsyncIterator[Escenario]:
    async with AsyncSession(motor, expire_on_commit=False) as preparacion:
        usuario = await crear(preparacion, UsuarioFactory, rol=RolUsuario.admin)
        d1 = await crear(preparacion, DestinoFactory)
        d2 = await crear(preparacion, DestinoFactory)
        luna = await crear(preparacion, HotelFactory, nombre="Luna", destino_id=d1.id)
        sol = await crear(preparacion, HotelFactory, nombre="Sol", destino_id=d2.id)
        await preparacion.commit()
    esc = Escenario(usuario.id, d1.id, d2.id, luna.id, sol.id)
    try:
        yield esc
    finally:
        async with motor.begin() as conexion:
            await conexion.execute(
                text("DELETE FROM hotel WHERE id IN (:a, :b)"), {"a": esc.luna_id, "b": esc.sol_id}
            )
            await conexion.execute(
                text("DELETE FROM destino WHERE id IN (:a, :b)"), {"a": esc.d1_id, "b": esc.d2_id}
            )
            await conexion.execute(text("DELETE FROM usuario WHERE id = :i"), {"i": esc.usuario_id})


async def _actor(sesion: AsyncSession, esc: Escenario) -> Usuario:
    actor = await sesion.get(Usuario, esc.usuario_id)
    assert actor is not None
    return actor


def _id_existente(error: object) -> uuid.UUID | None:
    """Id del hotel existente del 409, leído antes del rollback (que expira los objetos)."""
    return error.existente.id if isinstance(error, HotelDuplicado) else None


async def test_rf099_renombrar_con_otra_sesion_que_mueve_el_hotel_al_destino_del_duplicado_da_409(
    motor: AsyncEngine,
) -> None:
    """A ya tiene H cargado (Luna en D1); B lo mueve a D2, donde existe «Sol», y confirma; A lo
    renombra «Sol». El 409 debe traer el existente de D2 y no un 500 (IntegrityError)."""
    async with _escenario(motor) as esc:
        async with (
            AsyncSession(motor, expire_on_commit=False) as a,
            AsyncSession(motor, expire_on_commit=False) as b,
        ):
            actor_a, actor_b = await _actor(a, esc), await _actor(b, esc)
            leido = await a.get(Hotel, esc.luna_id)  # A lee H antes de que B confirme
            assert leido is not None and leido.destino_id == esc.d1_id
            await a.commit()  # A deja su lectura; el objeto sigue en su sesión

            await hoteles.editar_hotel(b, actor_b, esc.luna_id, {"destino_id": esc.d2_id})
            await b.commit()

            try:
                await hoteles.editar_hotel(a, actor_a, esc.luna_id, {"nombre": "Sol"})
                resultado: BaseException | None = None
            except BaseException as error:  # noqa: BLE001 - se inspecciona el tipo exacto
                resultado = error
            existente_id = _id_existente(resultado)
            await a.rollback()

        assert isinstance(resultado, HotelDuplicado), (
            f"se esperaba 409 HotelDuplicado y se obtuvo {type(resultado).__name__}: {resultado!r}"
        )
        assert existente_id == esc.sol_id


async def test_rf099_renombrar_mientras_otra_sesion_mueve_el_hotel_sin_confirmar_nunca_da_500(
    motor: AsyncEngine,
) -> None:
    """B mueve H a D2 y todavía no confirma; A pide renombrarlo «Sol». A debe esperar (fila
    bloqueada) y, cuando B confirma, validar contra D2: 409 con el existente."""
    async with _escenario(motor) as esc:
        async with (
            AsyncSession(motor, expire_on_commit=False) as a,
            AsyncSession(motor, expire_on_commit=False) as b,
        ):
            actor_a, actor_b = await _actor(a, esc), await _actor(b, esc)

            await hoteles.editar_hotel(b, actor_b, esc.luna_id, {"destino_id": esc.d2_id})

            editar = asyncio.create_task(
                hoteles.editar_hotel(a, actor_a, esc.luna_id, {"nombre": "Sol"})
            )
            await _esperar_bloqueo(motor, editar)
            await b.commit()

            resultado = (await asyncio.gather(editar, return_exceptions=True))[0]
            existente_id = _id_existente(resultado)
            await a.rollback()

        assert isinstance(resultado, HotelDuplicado), (
            f"se esperaba 409 HotelDuplicado y se obtuvo {type(resultado).__name__}: {resultado!r}"
        )
        assert existente_id == esc.sol_id


async def test_rf100_editar_un_hotel_que_otra_sesion_dio_de_baja_antes_del_update_da_409(
    motor: AsyncEngine,
) -> None:
    """A ya tiene H cargado como activo; B lo da de baja y confirma; A lo edita → 409 «cerrado»."""
    async with _escenario(motor) as esc:
        async with (
            AsyncSession(motor, expire_on_commit=False) as a,
            AsyncSession(motor, expire_on_commit=False) as b,
        ):
            actor_a, actor_b = await _actor(a, esc), await _actor(b, esc)
            leido = await a.get(Hotel, esc.luna_id)
            assert leido is not None and leido.estado is EstadoHotel.activo
            await a.commit()

            await hoteles.dar_de_baja_hotel(b, actor_b, esc.luna_id)
            await b.commit()

            try:
                await hoteles.editar_hotel(a, actor_a, esc.luna_id, {"categoria": "5 estrellas"})
                resultado: BaseException | None = None
            except BaseException as error:  # noqa: BLE001
                resultado = error
            await a.rollback()

        assert isinstance(resultado, Conflicto), (
            f"se esperaba 409 «está cerrado» y se obtuvo {type(resultado).__name__}"
        )
        assert "cerrado" in str(resultado)
        async with AsyncSession(motor) as lectura:
            final = await lectura.get(Hotel, esc.luna_id)
            assert final is not None
            assert final.estado is EstadoHotel.cerrado
            assert final.categoria == "4 estrellas"  # la edición de A no se aplicó


async def test_rf100_editar_mientras_otra_sesion_da_de_baja_sin_confirmar_espera_y_da_409(
    motor: AsyncEngine,
) -> None:
    """B da de baja H y no confirma; A pide editarlo. A espera la fila; al confirmar B ve el
    hotel cerrado y responde 409, sin pisar la baja."""
    async with _escenario(motor) as esc:
        async with (
            AsyncSession(motor, expire_on_commit=False) as a,
            AsyncSession(motor, expire_on_commit=False) as b,
        ):
            actor_a, actor_b = await _actor(a, esc), await _actor(b, esc)

            await hoteles.dar_de_baja_hotel(b, actor_b, esc.luna_id)

            editar = asyncio.create_task(
                hoteles.editar_hotel(a, actor_a, esc.luna_id, {"categoria": "5 estrellas"})
            )
            await _esperar_bloqueo(motor, editar)
            await b.commit()

            resultado = (await asyncio.gather(editar, return_exceptions=True))[0]
            if not isinstance(resultado, BaseException):
                await a.commit()
            else:
                await a.rollback()

        assert isinstance(resultado, Conflicto), (
            f"se esperaba 409 «está cerrado» y se obtuvo {type(resultado).__name__}"
        )
        async with AsyncSession(motor) as lectura:
            final = await lectura.get(Hotel, esc.luna_id)
            assert final is not None
            assert final.estado is EstadoHotel.cerrado
            assert final.categoria == "4 estrellas"


async def test_rf100_dar_de_baja_un_hotel_que_otra_sesion_ya_dio_de_baja_da_409(
    motor: AsyncEngine,
) -> None:
    """A tiene H cargado como activo; B lo da de baja y confirma; la baja de A → 409 «cerrado»."""
    async with _escenario(motor) as esc:
        async with (
            AsyncSession(motor, expire_on_commit=False) as a,
            AsyncSession(motor, expire_on_commit=False) as b,
        ):
            actor_a, actor_b = await _actor(a, esc), await _actor(b, esc)
            leido = await a.get(Hotel, esc.luna_id)
            assert leido is not None
            await a.commit()

            await hoteles.dar_de_baja_hotel(b, actor_b, esc.luna_id)
            await b.commit()

            try:
                await hoteles.dar_de_baja_hotel(a, actor_a, esc.luna_id)
                resultado: BaseException | None = None
            except BaseException as error:  # noqa: BLE001
                resultado = error
            await a.rollback()

        assert isinstance(resultado, Conflicto), (
            f"se esperaba 409 «está cerrado» y se obtuvo {type(resultado).__name__}"
        )


async def test_rf099_sin_concurrencia_editar_y_duplicar_se_comportan_como_siempre(
    motor: AsyncEngine,
) -> None:
    """Sin otra sesión: renombrar a un nombre libre guarda; mover al destino de «Sol» con el
    nombre «Sol» da 409 con el existente."""
    async with _escenario(motor) as esc:
        async with AsyncSession(motor, expire_on_commit=False) as s:
            actor = await _actor(s, esc)

            editado = await hoteles.editar_hotel(s, actor, esc.luna_id, {"nombre": "Luna llena"})
            assert editado.hotel.nombre == "Luna llena"

            await hoteles.editar_hotel(s, actor, esc.luna_id, {"nombre": "Sol"})
            try:
                await hoteles.editar_hotel(s, actor, esc.luna_id, {"destino_id": esc.d2_id})
                resultado: BaseException | None = None
            except BaseException as error:  # noqa: BLE001
                resultado = error
            existente_id = _id_existente(resultado)
            await s.rollback()

        assert isinstance(resultado, HotelDuplicado)
        assert existente_id == esc.sol_id
