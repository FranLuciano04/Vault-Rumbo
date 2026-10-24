"""T-038: la semilla de demo de M1 (destinos con requisitos, operadores y usuarios ficticios)
queda registrada en `datos-iniciales --demo` y es idempotente.

Supuestos del ticket (a confirmar): la semilla es `sembrar_configuracion(sesion)` en
`rumbo.datos.semillas.configuracion` y se registra en `rumbo.datos.semillas.SEMILLAS`; los
usuarios de demo son empleados o freelance con emails `@rumbo.test` y un `firebase_uid`
ficticio (no tienen cuenta en el Auth Emulator).
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import semillas
from rumbo.datos.modelos import Destino, Operador, RequisitoDestino, RolUsuario, Usuario
from rumbo.datos.semillas.configuracion import sembrar_configuracion
from rumbo.presentacion import cli


async def _contar(sesion: AsyncSession, modelo: type) -> int:
    return await sesion.scalar(select(func.count()).select_from(modelo)) or 0


async def _conteos(sesion: AsyncSession) -> tuple[int, int, int, int]:
    return (
        await _contar(sesion, Destino),
        await _contar(sesion, RequisitoDestino),
        await _contar(sesion, Operador),
        await _contar(sesion, Usuario),
    )


def test_rf089_la_semilla_de_configuracion_esta_registrada_en_la_cli() -> None:
    assert sembrar_configuracion in semillas.SEMILLAS


async def test_rf089_la_semilla_carga_destinos_con_requisitos(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)

    destinos = (await sesion.scalars(select(Destino).where(Destino.activo))).all()
    assert len(destinos) >= 2
    con_requisitos = (
        await sesion.scalars(
            select(RequisitoDestino.destino_id).where(RequisitoDestino.activo).distinct()
        )
    ).all()
    assert len(con_requisitos) >= 1
    assert set(con_requisitos) <= {destino.id for destino in destinos}


async def test_rf093_la_semilla_carga_operadores_activos(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)

    operadores = (await sesion.scalars(select(Operador).where(Operador.activo))).all()
    assert len(operadores) >= 2


async def test_rf144_la_semilla_carga_usuarios_ficticios_sin_pisar_roles_de_gestion(
    sesion: AsyncSession,
) -> None:
    await sembrar_configuracion(sesion)

    usuarios = (await sesion.scalars(select(Usuario))).all()
    assert len(usuarios) >= 2
    assert {u.rol for u in usuarios} <= {RolUsuario.empleado, RolUsuario.freelance}
    assert all(u.email.endswith("@rumbo.test") for u in usuarios)
    assert all(u.activo for u in usuarios)


async def test_rf089_la_semilla_es_idempotente(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    antes = await _conteos(sesion)

    await sembrar_configuracion(sesion)

    assert await _conteos(sesion) == antes


async def test_rf089_demo_de_la_cli_carga_la_semilla_y_dos_corridas_no_duplican(
    sesion: AsyncSession,
) -> None:
    def crear_cuenta(email: str, nombre: str) -> str:
        return "uid-duena-demo"

    for _ in range(2):
        await cli.datos_iniciales(
            sesion,
            nombre="Dueña de Prueba",
            email="duena@rumbo.test",
            crear_cuenta=crear_cuenta,
            demo=True,
        )

    destinos, requisitos, operadores, usuarios = await _conteos(sesion)
    assert destinos >= 2
    assert requisitos >= 1
    assert operadores >= 2
    assert usuarios >= 3  # la dueña y al menos dos de demo

    await cli.datos_iniciales(
        sesion,
        nombre="Dueña de Prueba",
        email="duena@rumbo.test",
        crear_cuenta=crear_cuenta,
        demo=True,
    )
    assert await _conteos(sesion) == (destinos, requisitos, operadores, usuarios)


async def test_rf089_la_semilla_no_duplica_nombres_cargados_con_otra_forma(
    sesion: AsyncSession,
) -> None:
    sesion.add(Destino(nombre="cancun", pais="México", activo=False))
    sesion.add(Operador(nombre="MAYORISTA DEMO SUR", activo=False))
    await sesion.flush()
    destinos_antes, _, operadores_antes, _ = await _conteos(sesion)

    await sembrar_configuracion(sesion)

    destinos, _, operadores, _ = await _conteos(sesion)
    assert destinos == destinos_antes + 2  # Bariloche y Nueva York; Cancún ya estaba
    assert operadores == operadores_antes + 1  # solo falta la operadora del Caribe
