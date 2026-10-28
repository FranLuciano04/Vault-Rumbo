"""T-085: la semilla de demo de M5 (hoteles y reseñas ficticios) queda registrada en
`datos-iniciales --demo` y es idempotente. Se verifican cantidades y estados, no datos puntuales.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import semillas
from rumbo.datos.modelos import EstadoResena, Hotel, Resena
from rumbo.datos.semillas.clientes import sembrar_clientes
from rumbo.datos.semillas.configuracion import sembrar_configuracion
from rumbo.datos.semillas.hoteles import sembrar_hoteles


async def _preparar(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)
    await sembrar_hoteles(sesion)


async def _contar(sesion: AsyncSession, modelo: type) -> int:
    return await sesion.scalar(select(func.count()).select_from(modelo)) or 0


def test_rf097_la_semilla_de_hoteles_esta_registrada_despues_de_configuracion_y_clientes() -> None:
    assert sembrar_hoteles in semillas.SEMILLAS
    orden = semillas.SEMILLAS.index
    assert orden(sembrar_hoteles) > orden(sembrar_configuracion)
    assert orden(sembrar_hoteles) > orden(sembrar_clientes)


async def test_rf101_la_semilla_carga_hoteles_con_resenas_publicadas_y_una_oculta_con_motivo(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    assert await _contar(sesion, Hotel) >= 5
    resenas = list((await sesion.scalars(select(Resena))).all())
    assert any(r.estado is EstadoResena.publicada for r in resenas)
    ocultas = [r for r in resenas if r.estado is EstadoResena.oculta]
    assert ocultas, "falta al menos una reseña oculta"
    assert all(r.motivo_baja for r in ocultas)


async def test_rf097_correr_la_semilla_dos_veces_no_suma_hoteles_ni_resenas(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)
    hoteles = await _contar(sesion, Hotel)
    resenas = await _contar(sesion, Resena)

    await sembrar_hoteles(sesion)

    assert await _contar(sesion, Hotel) == hoteles
    assert await _contar(sesion, Resena) == resenas
