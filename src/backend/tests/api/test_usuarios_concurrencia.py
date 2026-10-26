"""H-03 de la review de M1 (DEC-0019): dos cambios simultáneos no pueden dejar al sistema sin
`admin` activo (CU-25 A4) ni sin `dueno` activa (CU-25 A5), RF-149.

Cada escenario corre en dos sesiones con conexiones y transacciones propias, con commit real (el
resto de los tests corre en una transacción que se revierte), así que el fixture borra al final
lo que crea. Determinista: la primera transacción hace su cambio y queda abierta con los bloqueos
tomados; la segunda arranca recién entonces y se espera, mirando `pg_blocking_pids`, a que quede
trabada en la base (o a que termine, si no hay bloqueo) antes de confirmar la primera.
"""

import asyncio
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession

from rumbo.core.errores import Conflicto
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.negocio.servicios import seguridad
from tests.api.test_usuarios import GestorDeCuentasFalso

# Un cambio que le saca a `objetivo_id` el rol protegido, hecho por `actor_id` en `sesion`.
Cambio = Callable[[AsyncSession, uuid.UUID, uuid.UUID], Awaitable[Usuario]]
CrearUsuario = Callable[[RolUsuario], Awaitable[uuid.UUID]]

_ESPERA_MAXIMA = 10.0  # segundos: tope de seguridad, no una espera fija
_PASO = 0.01


async def _dar_de_baja(
    sesion: AsyncSession, actor_id: uuid.UUID, objetivo_id: uuid.UUID
) -> Usuario:
    actor = await sesion.get(Usuario, actor_id)
    assert actor is not None
    return await seguridad.dar_de_baja_usuario(sesion, actor, GestorDeCuentasFalso(), objetivo_id)


async def _quitar_rol(sesion: AsyncSession, actor_id: uuid.UUID, objetivo_id: uuid.UUID) -> Usuario:
    actor = await sesion.get(Usuario, actor_id)
    assert actor is not None
    return await seguridad.editar_usuario(sesion, actor, objetivo_id, {"rol": RolUsuario.empleado})


COMBINACIONES = [
    pytest.param(_dar_de_baja, _dar_de_baja, id="baja-y-baja"),
    pytest.param(_quitar_rol, _quitar_rol, id="democion-y-democion"),
    pytest.param(_dar_de_baja, _quitar_rol, id="baja-y-democion"),
    pytest.param(_quitar_rol, _dar_de_baja, id="democion-y-baja"),
]


async def _activos_con_rol(motor: AsyncEngine, rol: RolUsuario) -> set[uuid.UUID]:
    """Ids de los usuarios activos con `rol`, en el estado confirmado (sesión nueva)."""
    async with AsyncSession(motor) as lectura:
        consulta = select(Usuario.id).where(Usuario.rol == rol, Usuario.activo.is_(True))
        return set((await lectura.scalars(consulta)).all())


@pytest.fixture
async def crear_confirmado(motor: AsyncEngine) -> AsyncIterator[CrearUsuario]:
    """Crea usuarios activos con commit real y los borra al terminar el test.

    Antes exige que no haya ningún `admin` ni `dueno` activo confirmado: el servicio cuenta
    sobre toda la base, y un residuo haría pasar los dos cambios sin que haya carrera."""
    async with AsyncSession(motor) as lectura:
        residuos = await lectura.scalar(
            select(func.count())
            .select_from(Usuario)
            .where(Usuario.rol.in_([RolUsuario.admin, RolUsuario.dueno]), Usuario.activo.is_(True))
        )
    assert residuos == 0, f"la base de tests tiene {residuos} admin/dueno activos confirmados"

    creados: list[uuid.UUID] = []

    async def _crear(rol: RolUsuario) -> uuid.UUID:
        sufijo = uuid.uuid4().hex[:12]
        async with AsyncSession(motor, expire_on_commit=False) as preparacion:
            usuario = Usuario(
                nombre=f"Concurrencia {rol.value} {sufijo}",
                email=f"concurrencia-{sufijo}@rumbo.test",
                firebase_uid=f"uid-concurrencia-{sufijo}",
                rol=rol,
                activo=True,
            )
            preparacion.add(usuario)
            await preparacion.commit()
        creados.append(usuario.id)
        return usuario.id

    try:
        yield _crear
    finally:
        async with motor.begin() as conexion:
            await conexion.execute(
                text("DELETE FROM usuario WHERE id = ANY(:ids)"), {"ids": creados}
            )


async def _esperar_bloqueada_o_terminada(
    observador: AsyncConnection, pid: int, tarea: asyncio.Task[Usuario]
) -> None:
    """Vuelve cuando la conexión `pid` está esperando un bloqueo de otra o cuando `tarea` ya
    terminó (sin bloqueo no hay a quién esperar). Si no pasa ninguna de las dos, falla."""
    bucle = asyncio.get_running_loop()
    limite = bucle.time() + _ESPERA_MAXIMA
    while bucle.time() < limite:
        if tarea.done():
            return
        bloqueadores = await observador.scalar(
            text("SELECT cardinality(pg_blocking_pids(:pid))"), {"pid": pid}
        )
        if bloqueadores:
            return
        await asyncio.sleep(_PASO)
    tarea.cancel()
    pytest.fail("la segunda transacción ni se bloqueó ni terminó: no se forzó la superposición")


async def _en_paralelo(
    motor: AsyncEngine,
    primero: tuple[Cambio, uuid.UUID, uuid.UUID],
    segundo: tuple[Cambio, uuid.UUID, uuid.UUID],
) -> Usuario | BaseException:
    """Corre los dos cambios superpuestos y confirma el que salga bien. El primero tiene que
    salir bien; devuelve el resultado del segundo (el `Usuario` o la excepción)."""
    cambio_1, actor_1, objetivo_1 = primero
    cambio_2, actor_2, objetivo_2 = segundo
    async with (
        motor.connect() as observador,
        AsyncSession(motor, expire_on_commit=False) as primera,
        AsyncSession(motor, expire_on_commit=False) as segunda,
    ):
        pid_segunda = await segunda.scalar(text("SELECT pg_backend_pid()"))
        assert isinstance(pid_segunda, int)

        # la primera hace su cambio y queda abierta, con los bloqueos tomados
        await cambio_1(primera, actor_1, objetivo_1)

        # la segunda arranca mientras la primera sigue abierta
        tarea = asyncio.create_task(cambio_2(segunda, actor_2, objetivo_2))
        await _esperar_bloqueada_o_terminada(observador, pid_segunda, tarea)
        await primera.commit()

        resultado = (await asyncio.gather(tarea, return_exceptions=True))[0]
        if isinstance(resultado, BaseException):
            await segunda.rollback()
        else:
            await segunda.commit()
    return resultado


@pytest.mark.parametrize(("cambio_1", "cambio_2"), COMBINACIONES)
async def test_rf149_dos_cambios_simultaneos_no_dejan_sin_admin(
    cambio_1: Cambio, cambio_2: Cambio, motor: AsyncEngine, crear_confirmado: CrearUsuario
) -> None:
    """CU-25 A4: con dos admins activos, sacarle el rol protegido a cada uno a la vez deja uno."""
    duena = await crear_confirmado(RolUsuario.dueno)
    admin_a = await crear_confirmado(RolUsuario.admin)
    admin_b = await crear_confirmado(RolUsuario.admin)

    resultado = await _en_paralelo(motor, (cambio_1, duena, admin_a), (cambio_2, duena, admin_b))

    assert isinstance(resultado, Conflicto), (
        f"el segundo cambio no dio 409 sino {resultado!r}: sin bloqueo los dos ven dos admins"
    )
    assert await _activos_con_rol(motor, RolUsuario.admin) == {admin_b}


@pytest.mark.parametrize(("cambio_1", "cambio_2"), COMBINACIONES)
async def test_cu25_a5_dos_cambios_simultaneos_no_dejan_sin_duena(
    cambio_1: Cambio, cambio_2: Cambio, motor: AsyncEngine, crear_confirmado: CrearUsuario
) -> None:
    """CU-25 A5 (RF-149): con dos dueñas activas, cada una le saca el rol a la otra a la vez;
    queda una. Solo una dueña puede bajar o demover a otra, por eso actúan cruzadas."""
    duena_a = await crear_confirmado(RolUsuario.dueno)
    duena_b = await crear_confirmado(RolUsuario.dueno)

    resultado = await _en_paralelo(
        motor, (cambio_1, duena_a, duena_b), (cambio_2, duena_b, duena_a)
    )

    assert isinstance(resultado, Conflicto), (
        f"el segundo cambio no dio 409 sino {resultado!r}: sin bloqueo las dos ven dos dueñas"
    )
    assert await _activos_con_rol(motor, RolUsuario.dueno) == {duena_a}
