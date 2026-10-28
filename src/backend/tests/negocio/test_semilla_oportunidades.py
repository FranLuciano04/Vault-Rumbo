"""T-074: la semilla de demo de M4 (oportunidades y cotizaciones ficticias) queda registrada en
`datos-iniciales --demo` y es idempotente.

Supuestos del ticket (a confirmar): la semilla es `sembrar_oportunidades(sesion)` en
`rumbo.datos.semillas.oportunidades` y se registra en `rumbo.datos.semillas.SEMILLAS` después de
la de clientes (de la que toma los clientes) y la de configuración (de la que toma los
responsables). Crea oportunidades en varios estados del embudo y al menos una cotización, y se
verifican cantidades y estados, no datos puntuales. Idempotencia: volver a correrla no suma
oportunidades ni cotizaciones.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import semillas
from rumbo.datos.modelos import Cliente, Cotizacion, Oportunidad
from rumbo.datos.semillas.clientes import sembrar_clientes
from rumbo.datos.semillas.configuracion import sembrar_configuracion
from rumbo.datos.semillas.oportunidades import sembrar_oportunidades
from rumbo.presentacion import cli


async def _preparar(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)
    await sembrar_oportunidades(sesion)


async def _oportunidades(sesion: AsyncSession) -> list[Oportunidad]:
    return list((await sesion.scalars(select(Oportunidad))).all())


async def _contar(sesion: AsyncSession, modelo: type) -> int:
    return await sesion.scalar(select(func.count()).select_from(modelo)) or 0


def test_rf010_la_semilla_de_oportunidades_esta_registrada_en_la_cli() -> None:
    assert sembrar_oportunidades in semillas.SEMILLAS


def test_rf010_la_semilla_de_oportunidades_corre_despues_de_la_de_clientes() -> None:
    assert semillas.SEMILLAS.index(sembrar_oportunidades) > semillas.SEMILLAS.index(
        sembrar_clientes
    )


async def test_rf010_la_semilla_carga_oportunidades_en_varios_estados_del_embudo(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    oportunidades = await _oportunidades(sesion)
    assert len(oportunidades) >= 5
    estados = {o.estado for o in oportunidades}
    assert len(estados) >= 4, f"el embudo de demo debería cubrir varios estados: {estados}"
    assert all(o.destino_consultado.strip() for o in oportunidades)


async def test_rf017_la_semilla_incluye_una_perdida_con_motivo(sesion: AsyncSession) -> None:
    await _preparar(sesion)

    perdidas = [o for o in await _oportunidades(sesion) if o.estado.value == "perdida"]
    assert perdidas, "falta al menos una oportunidad perdida"
    assert all(o.motivo_perdida is not None for o in perdidas)


async def test_rf021_la_semilla_carga_al_menos_una_cotizacion_de_una_oportunidad_de_la_semilla(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    cotizaciones = list((await sesion.scalars(select(Cotizacion))).all())
    assert cotizaciones, "falta al menos una cotización"
    ids = {o.id for o in await _oportunidades(sesion)}
    assert all(c.oportunidad_id in ids for c in cotizaciones)
    assert all(c.items for c in cotizaciones)


async def test_rf010_las_oportunidades_son_de_clientes_de_la_semilla_de_clientes(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    clientes = {c.id for c in (await sesion.scalars(select(Cliente))).all()}
    assert all(o.cliente_id in clientes for o in await _oportunidades(sesion))


async def test_rf010_la_semilla_es_idempotente(sesion: AsyncSession) -> None:
    await _preparar(sesion)
    oportunidades = await _contar(sesion, Oportunidad)
    cotizaciones = await _contar(sesion, Cotizacion)
    assert oportunidades > 0
    assert cotizaciones > 0

    await sembrar_oportunidades(sesion)

    assert await _contar(sesion, Oportunidad) == oportunidades
    assert await _contar(sesion, Cotizacion) == cotizaciones


async def test_rf010_demo_de_la_cli_carga_oportunidades_y_dos_corridas_no_duplican(
    sesion: AsyncSession,
) -> None:
    def crear_cuenta(email: str, nombre: str) -> str:
        return "uid-duena-demo"

    async def correr() -> None:
        await cli.datos_iniciales(
            sesion,
            nombre="Dueña de Prueba",
            email="duena@rumbo.test",
            crear_cuenta=crear_cuenta,
            demo=True,
        )

    await correr()
    total = await _contar(sesion, Oportunidad)
    assert total >= 5

    await correr()
    assert await _contar(sesion, Oportunidad) == total
