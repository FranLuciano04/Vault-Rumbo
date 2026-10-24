"""T-049: la semilla de demo de M2 (clientes ficticios) queda registrada en `datos-iniciales --demo`
y es idempotente.

Supuestos del ticket (a confirmar): la semilla es `sembrar_clientes(sesion)` en
`rumbo.datos.semillas.clientes` y se registra en `rumbo.datos.semillas.SEMILLAS`; los clientes
de demo usan contactos `@rumbo.test` o teléfonos ficticios y se buscan por contacto para no
duplicarse. Corre después de la de configuración, así que puede asignarlos a los usuarios de demo.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import semillas
from rumbo.datos.modelos import Cliente
from rumbo.datos.semillas.clientes import sembrar_clientes
from rumbo.datos.semillas.configuracion import sembrar_configuracion
from rumbo.presentacion import cli


async def _contar(sesion: AsyncSession) -> int:
    return await sesion.scalar(select(func.count()).select_from(Cliente)) or 0


def test_rf003_la_semilla_de_clientes_esta_registrada_en_la_cli() -> None:
    assert sembrar_clientes in semillas.SEMILLAS


def test_rf003_la_semilla_de_clientes_corre_despues_de_la_de_configuracion() -> None:
    assert semillas.SEMILLAS.index(sembrar_clientes) > semillas.SEMILLAS.index(
        sembrar_configuracion
    )


async def test_rf003_la_semilla_carga_clientes_ficticios(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)

    clientes = (await sesion.scalars(select(Cliente))).all()
    assert len(clientes) >= 3
    assert all(c.nombre.strip() and c.contacto.strip() for c in clientes)
    # Ficticios: ningún contacto es un email real, todos van a un dominio de prueba.
    emails = [c.contacto for c in clientes if "@" in c.contacto]
    assert all(email.endswith("@rumbo.test") for email in emails)
    # Contactos únicos: la semilla no genera duplicados entre sí (RF-003).
    assert len({c.contacto for c in clientes}) == len(clientes)


async def test_rf003_la_semilla_cubre_varios_segmentos(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)

    segmentos = {c.segmento for c in (await sesion.scalars(select(Cliente))).all()}
    assert len(segmentos) >= 2


async def test_rf150_la_semilla_asigna_asesores_de_demo(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)

    clientes = (await sesion.scalars(select(Cliente))).all()
    asesores = {c.asesor.email for c in clientes if c.asesor}
    assert asesores, "al menos un cliente de demo tiene asesor asignado"
    assert all(email.endswith("@rumbo.test") for email in asesores)


async def test_rf003_la_semilla_es_idempotente(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)
    antes = await _contar(sesion)

    await sembrar_clientes(sesion)

    assert await _contar(sesion) == antes


async def test_rf003_la_semilla_no_duplica_un_contacto_ya_cargado(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)
    existente = (await sesion.scalars(select(Cliente).limit(1))).one()
    total = await _contar(sesion)
    existente.nombre = "Nombre editado por la agencia"
    await sesion.flush()

    await sembrar_clientes(sesion)

    assert await _contar(sesion) == total
    await sesion.refresh(existente)
    assert existente.nombre == "Nombre editado por la agencia"  # no pisa lo cargado


async def test_rf003_demo_de_la_cli_carga_clientes_y_dos_corridas_no_duplican(
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

    assert await _contar(sesion) >= 3
    total = await _contar(sesion)

    await cli.datos_iniciales(
        sesion,
        nombre="Dueña de Prueba",
        email="duena@rumbo.test",
        crear_cuenta=crear_cuenta,
        demo=True,
    )
    assert await _contar(sesion) == total
