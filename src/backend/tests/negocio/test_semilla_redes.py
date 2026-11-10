"""T-134: la semilla de demo del módulo redes (piezas de ContenidoRed ficticias) queda registrada
en `datos-iniciales --demo`, cubre el tablero y es idempotente."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import semillas
from rumbo.datos.modelos import ContenidoRed, Usuario
from rumbo.datos.modelos.enums import EstadoKanban, RolUsuario
from rumbo.datos.semillas.redes import sembrar_redes
from rumbo.negocio.servicios.seguridad import asegurar_duena


async def _preparar(sesion: AsyncSession) -> None:
    await asegurar_duena(
        sesion,
        nombre="Dueña de Prueba",
        email="duena@rumbo.test",
        crear_cuenta=lambda e, n: "uid-d",
    )
    await sembrar_redes(sesion)


async def _piezas(sesion: AsyncSession) -> list[ContenidoRed]:
    return list((await sesion.scalars(select(ContenidoRed))).all())


async def _contar(sesion: AsyncSession) -> int:
    return await sesion.scalar(select(func.count()).select_from(ContenidoRed)) or 0


def test_la_semilla_de_redes_esta_registrada_en_la_cli() -> None:
    assert sembrar_redes in semillas.SEMILLAS


async def test_la_semilla_carga_piezas_en_varias_columnas_y_canales(sesion: AsyncSession) -> None:
    await _preparar(sesion)

    piezas = await _piezas(sesion)
    assert 6 <= len(piezas) <= 8
    estados = {p.estado_kanban for p in piezas}
    assert {EstadoKanban.publicado, EstadoKanban.descartado} <= estados
    assert len({p.canal for p in piezas}) >= 2
    assert len({p.titulo for p in piezas}) == len(piezas)


async def test_la_semilla_de_redes_es_idempotente(sesion: AsyncSession) -> None:
    await _preparar(sesion)
    antes = await _contar(sesion)

    await sembrar_redes(sesion)

    assert await _contar(sesion) == antes


async def test_la_semilla_no_pisa_una_pieza_que_la_agencia_movio(sesion: AsyncSession) -> None:
    await _preparar(sesion)
    pieza = (await _piezas(sesion))[0]
    estado = EstadoKanban.listo if pieza.estado_kanban != EstadoKanban.listo else EstadoKanban.idea
    pieza.estado_kanban = estado
    await sesion.flush()

    await sembrar_redes(sesion)

    await sesion.refresh(pieza)
    assert pieza.estado_kanban == estado


async def test_las_piezas_quedan_a_nombre_de_la_duena(sesion: AsyncSession) -> None:
    await _preparar(sesion)

    duena = (await sesion.scalars(select(Usuario).where(Usuario.rol == RolUsuario.dueno))).one()
    assert {p.usuario_id for p in await _piezas(sesion)} == {duena.id}


async def test_sin_duena_la_semilla_no_carga_nada(sesion: AsyncSession) -> None:
    await sembrar_redes(sesion)

    assert await _contar(sesion) == 0
